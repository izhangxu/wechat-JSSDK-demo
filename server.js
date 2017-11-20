const path = require('path');
const wechat = require('wechat');
const Koa = require('koa');
const render = require('koa-art-template');
const Router = require('koa-router');
const logger = require('koa-logger');
const serve = require('koa-static');
const bodyParser = require('koa-bodyparser');
const port = 18080;

const app = new Koa();
const router = new Router();

render(app, {
	root: path.join(__dirname, 'views'),
	extname: '.art'
});

app.use(serve(__dirname + '/mp'));

app.use(logger());

app.use(bodyParser());

app.use(async(ctx, next) => {
	try {
		await next();
	} catch (err) {
		ctx.response.status = err.statusCode || err.status || 500;
		ctx.response.body = err.message;
		ctx.app.emit('error', err, ctx);
	}
});

const routes = require('./routes/index')(router);

app.use(router.routes());

app.listen(port);

app.on('error', (err) => {
	console.log('app error: ' + err.message);
	console.log(err);
});