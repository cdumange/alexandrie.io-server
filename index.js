var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var http = require('http');

var app = express();

process.env.debug = true;

const cfserver = require('./config/server');
const configAlex = require('./config/io-client.json');
let configMail= require('./config/mail.json');
const MessageManager = require('./lib/messManager');
const DataManager = require('./lib/dataManager');
const mongoClient = require('./lib/mongo').mongoClient;
const MailClient = require('./lib/MailClient');
const logger = require('alexandrie.io-node');

const mongo = new mongoClient();
let db = null;

mongo.getConn().then((dba) => {
  db = dba;
  const messManager = new MessageManager(db);
  const dataManager = new DataManager(messManager);
  require('./lib/connectors/websocket')(messManager);
})

//initialisation du logger
if(configAlex != {}) logger.getInstance().init(configAlex);

//Lancement de l'interfacage mail
if (configMail != {}) new MailClient(configMail);
//Lancement rest
const restfull = require('./lib/connectors/rest');
//lancement scan AMQ
require('./lib/connectors/amq')();


var port = normalizePort(cfserver.port || '9514');
app.set('port', port);
var server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

app.use(bodyParser.json({
  limit: '10mb',
  type: 'application/json'
})); //app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());

//Chargement du service rest
app.use('/rest', restfull);













// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

//Gestion des reject non gérés
process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason)
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  if (process.env.debug)
    console.log('Erreur ' + err.message + '\r\n' +
      'stack : ' + err.stack);
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

function debug(test) {
  if (process.env.debug)
    console.log(test);
}

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ?
    'Pipe ' + port :
    'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ?
    'pipe ' + addr :
    'port ' + addr.port;
  console.log('Listening on ' + bind);
}