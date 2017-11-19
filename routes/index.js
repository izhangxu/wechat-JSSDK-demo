const https = require('https');
const jsSHA = require('jssha');
const appInfo = require('./../apps-info');

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
		https.get(API.ticket + '?access_token=' + access_token + '&type=jsapi', (res) => {
			let rawData = '',
				resp = {};
			res.on('data', function(trunk) {
				rawData += trunk;
			});
			res.on('end', function() {
				console.log('return ticket:  ' + rawData);
				try {
					resp = JSON.parse(rawData);
				} catch (e) {
					ctx.body = {
						err: '获取ticket出错'
					};
					return;
				}
				const appid = appInfo.appid;
				const ts = createTimestamp();
				const nonceStr = createNonceStr();
				const ticket = resp.ticket;
				const signature = createSign(ticket, nonceStr, ts, url);

				const generateData = {
					appid: appid,
					timestamp: ts,
					nonceStr: nonceStr,
					signature: signature,
					url: url
				};

				cachedSignatures[url] = generateData;
				ctx.body = generateData;
			});
		});
	};
	// 验证
	router.post('/wx_sign', ctx => {
		const _url = ctx.request.body.url;
		const signatureObj = cachedSignatures[_url];
		if (!_url) {
			ctx.body = {
				err: '缺少url参数'
			};
			return;
		}
		// console.log(signatureObj);
		if (signatureObj && signatureObj.timestamp) {
			const t = createTimestamp() - signatureObj.timestamp;

			if (t < expireTime && signatureObj.url == _url) {
				ctx.body = {
					nonceStr: signatureObj.nonceStr,
					timestamp: signatureObj.timestamp,
					appid: signatureObj.appid,
					signature: signatureObj.signature,
					url: signatureObj.url
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
			let rawData1 = '',
				resp1 = {};
			res.on('data', (trunk) => {
				rawData1 += trunk;
			});
			res.on('end', () => {
				try {
					resp1 = JSON.parse(rawData1);
				} catch (e) {
					ctx.body = {
						err: '解析access_token返回的JSON数据错误'
					};
					return;
				}
				getTicket(_url, ctx, resp1.access_token);
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
};