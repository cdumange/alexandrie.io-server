const config = require('../../config/server.json');

var router = require('express').Router();
var socket = require('socket.io-client').connect('ws://localhost:' + config.portws);

router.post('/', (req, res, next) => {
  let body = req.body;

  if(body != undefined){
    if(typeof body ==='string')
      body = JSON.parse(body);

    if (body.typeMessage == undefined || body.message == undefined)
      res.status(400).send('incorrect parameters');
    else{
      socket.emit('msg', body);
      res.status(200).send('');
    }
  }
  else {
    res.status(400).send('no body');
  }
});

module.exports = router;
