const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const compression = require('compression');
const winston = require('winston');
const expressWinston = require('express-winston');
const mongoose = require('mongoose');
const Promise = require('bluebird');

const visitCtrl = require('./controllers/visit.controller');
const dbConfig = require('./config/db');
const sendErrMailFn = require('./util/mail');
const routes = require('./routes/index.route');
const author = require('./routes/author.route');
const visit = require('./routes/visit.route');
const session = require('./routes/session.route');

const app = express();

mongoose.Promise = Promise;

mongoose.connect(dbConfig.address)
  .then(() => console.log('数据库连接成功'), () => {

    /**
     * @todo 保证服务器数据库稳定之后需要在未连接上数据库的时候抛出异常
     */
    winston.error('unable to connect to database');
    // throw new Error('unable to connect to database');
  });

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(visitCtrl.create);

app.use('/', routes);
app.use('/author', author);
app.use(visit);
app.use(session);

// 处理404
app.use(function(req, res, next) {
  res.status(404);
  res.render('404');
});

// 开发环境中发送错误堆栈到前端并打印到控制台
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err,
    });
    console.error(err);
  });
}

// 生产环境中保留错误日志
app.use(expressWinston.errorLogger({
  transports: [
    new winston.transports.Console({
      json: true,
      colorize: true,
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
    }),
  ],
}));

// 错误时发送邮件提醒
app.use(function(err, req, res, next) {
  sendErrMailFn(err);
  next(err);
});

// 生产环境中的错误处理
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {},
  });
});


module.exports = app;
