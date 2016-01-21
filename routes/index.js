var https = require('https');
var jsSHA = require('jssha');


module.exports = function(app) {

	var expireTime = 7200 - 100;
	var getAppsInfo = require('./../apps-info');
	var appIds = getAppsInfo();
	var cachedSignatures = {};
	/*创造随机字符串*/
	var createNonceStr = function() {
		return Math.random().toString(36).substr(2, 15);
	};
	/*创建时间戳*/
	var createTimestamp = function() {
		return parseInt(new Date().getTime() / 1000) + '';
	};
	/*创造signature*/
	var createSign = function(ticket, noncestr, ts, url) {
		var str = 'jsapi_ticket=' + ticket + '&noncestr=' + noncestr + '&timestamp=' + ts + '&url=' + url;
		shaObj = new jsSHA(str, 'TEXT');
		return shaObj.getHash('SHA-1', 'HEX');
	}
	/*获取票*/
	var getTicket = function (url, index, res, accessData) {
		https.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token='+ accessData.access_token +'&type=jsapi', function(_res1){
			var str1 = '', resp1;
			_res1.on('data', function(data){
				str1 += data;
			});
			_res1.on('end', function(){
				console.log('return ticket:  ' + str1);
				try{
					resp1 = JSON.parse(str1);
				}catch(e){
			        return res.json({
			        	err: '获取ticket出错'
			        });
				}
				var appid = appIds[index].appid;
				var ts = createTimestamp();
				var nonceStr = createNonceStr();
				var ticket = resp1.ticket;
				var signature = createSign(ticket, nonceStr, ts, url);

				cachedSignatures[url] = {
					nonceStr: nonceStr
					,appid: appid
					,timestamp: ts
					,signature: signature
					,url: url
					,ticket: ticket
				};
				
				res.json({
					nonceStr: nonceStr
					,timestamp: ts
					,appid: appid
					,signature: signature
					,url: url
					,ticket: ticket
				});
			});
		});
	};

	app.get('/fish', function(req, res) {
		res.render('fish');
	})

	app.get('/test', function(req, res) {
		res.render('test', {
			layout: null
		});
	})

	app.post('/sign/:index', function(req, res) {
		var index = req.params.index;
		var _url = req.body.url;
		var signatureObj = cachedSignatures[_url];
		if (!_url) {
			return res.json({
				err: '缺少url参数'
			});
		}
		console.log(signatureObj);
		if (signatureObj && signatureObj.timestamp) {
			var t = createTimestamp() - signatureObj.timestamp;

			if (t < expireTime && signatureObj.url == _url) {
				return res.json({
					nonceStr: signatureObj.nonceStr,
					timestamp: signatureObj.timestamp,
					appid: signatureObj.appid,
					signature: signatureObj.signature,
					url: signatureObj.url,
					tic: signatureObj.tic
				})
			}
		}
		https.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + appIds[index].appid + '&secret=' + appIds[index].secret, function(_res) {
			var str = '';
			_res.on('data', function(data) {
				str += data;
			})
			_res.on('end', function() {
				try {
					var resp = JSON.parse(str);
				} catch (e) {
					return res.json({
						err: '解析access_token返回的JSON数据错误'
					});
				}
				getTicket(_url, index, res, resp);
			})
		});
	});
};