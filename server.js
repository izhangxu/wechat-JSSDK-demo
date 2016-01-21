var wechat = require("wechat");
var express = require('express');
var fs = require('fs');
var https = require('https');
var accesstoken = null;
var ticket = null;
var port = 18080;


var app = express();
/*引入模板引擎*/
var handlebars = require('express3-handlebars')
	.create({
		defaultLayout: 'main'
	});

app.use(express.query());
app.use(require('body-parser')());
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

var routes = require('./routes/index');
var autoViews = {};
app.use(function(req, res, next){
	var path = req.path.toLowerCase();
	//检查缓存，如果有就渲染这个视图
	if(autoViews[path]) return res.render(autoViews[path]);
	//如果没有缓存，就检查有无.handlebars文件能匹配
	if(fs.existsSync(__dirname + '/views' + path + '.handlebars')){
		autoViews[path] = path.replace(/^\//, '');
		return res.render(autoViews[path]);
	}
	next();
})

app.use('/wechat', wechat('weixin', function (req, res, next) {
    var message = req.weixin;
    if(message.MsgType == 'text'){
          res.reply({ type: "text", content: "您输入的文本 " + message.Content});  
    }
}));

routes(app);

app.listen(port);
