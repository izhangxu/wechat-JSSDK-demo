const https = require('https');
const jsSHA = require('jssha');
const appInfo = require('../apps-info');
const token = 'weixin'; // 和微信公众平台基本配置中的相同

const API = {
	ticket: 'https://api.weixin.qq.com/cgi-bin/ticket/getticket',
	token: 'https://api.weixin.qq.com/cgi-bin/token'
};
/**
 * 创造随机字符串
 * @return {String}
 */
const createNonceStr = () => {
	return Math.random().toString(36).substr(2, 15);
};
/**
 * 创建时间戳
 * @return {String}
 */
const createTimestamp = () => {
	return parseInt(new Date().getTime() / 1000) + '';
};
/**
 * 生成signature
 * @param  {String} ticket
 * @param  {String} noncestr
 * @param  {String} ts
 * @param  {String} url
 * @return {String}
 */
const createSign = (ticket, noncestr, ts, url) => {
	const str = 'jsapi_ticket=' + ticket + '&noncestr=' + noncestr + '&timestamp=' + ts + '&url=' + url;
	const shaObj = new jsSHA(str, 'TEXT');
	return shaObj.getHash('SHA-1', 'HEX');
};


module.exports = function(router) {
	const expireTime = 7200 - 100;

	let cachedSignatures = {};
	/**
	 * 获取票
	 * @param  {String} url        url
	 * @param  {Object} accessData token
	 * @return {Object}            json
	 */
	const getTicket = (url, ctx, access_token) => {
		console.log('return access_token:  ' + access_token);
		https.get(API.ticket + '?access_token=' + access_token + '&type=jsapi', (res) => {
			let rawData = '';
			res.on('data', function(trunk) {
				rawData += trunk;
			});
			res.on('end', function() {
				console.log('return ticket:  ' + rawData);
				try {
					const resp = JSON.parse(rawData);
					const ts = createTimestamp();
					const nonceStr = createNonceStr();
					const ticket = resp.ticket;
					const signature = createSign(ticket, nonceStr, ts, url);

					const generateData = {
						appid: appInfo.appid,
						timestamp: ts,
						nonceStr: nonceStr,
						signature: signature,
						url: url
					};

					cachedSignatures[url] = generateData;
					ctx.body = {
						status: 1,
						data: generateData,
						msg: 'success'
					};
				} catch (e) {
					ctx.body = {
						status: 0,
						data: null,
						msg: '获取ticket失败'
					};
				}
			});
		});
	};
	// 验证
	router.post('/wx_sign', ctx => {
		const _url = ctx.request.body.url;
		const signatureObj = cachedSignatures[_url];
		if (!_url) {
			ctx.body = {
				status: 0,
				data: null,
				msg: '缺少url参数'
			};
			return;
		}
		// console.log(signatureObj);
		if (signatureObj && signatureObj.timestamp) {
			const t = createTimestamp() - signatureObj.timestamp;

			if (t < expireTime && signatureObj.url == _url) {
				ctx.body = {
					status: 1,
					data: {
						nonceStr: signatureObj.nonceStr,
						timestamp: signatureObj.timestamp,
						appid: signatureObj.appid,
						signature: signatureObj.signature,
						url: signatureObj.url
					},
					msg: 'success'
				};
			}
		}
		/**
		 * 获取assecs_token
		 * @param  {String}   appid
		 * @param  {String}	  secret
		 * @return {Object}
		 */
		https.get(API.token + '?grant_type=client_credential&appid=' + appInfo.appid + '&secret=' + appInfo.secret, (res) => {
			let rawData1 = '';
			res.on('data', (trunk) => {
				rawData1 += trunk;
			});
			res.on('end', () => {
				try {
					const resp1 = JSON.parse(rawData1);
					console.log('return rawData1: ' + rawData1);
					getTicket(_url, ctx, resp1.access_token);
				} catch (e) {
					ctx.body = {
						status: 0,
						data: null,
						msg: e
					};
				}
			});
		});
	});
	// 首页
	router.get('/', async ctx => {
		const buttons = [{
			value: '拍照',
			id: 'btn1'
		}, {
			value: '显示右上角菜单',
			id: 'btn2'
		}, {
			value: '隐藏右上角菜单',
			id: 'btn3'
		}, {
			value: '扫描二维码',
			id: 'btn4'
		}];
		await ctx.render('content', {
			buttons
		});
	});

	router.get('/wx', async ctx => {
		const signature = ctx.query.signature;
		const timestamp = ctx.query.timestamp;
		const echostr = ctx.query.echostr;
		const nonce = ctx.query.nonce;
		const oriArr = [token, timestamp, nonce];
		oriArr.sort();
		const shaObj = new jsSHA(oriArr.join(''), 'TEXT');
		const scyptoString = shaObj.getHash('SHA-1', 'HEX');
		if (scyptoString == signature) {
			ctx.body = echostr;
		} else {
			ctx.throw(404);
		}
	});
};