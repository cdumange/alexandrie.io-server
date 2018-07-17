const config = require('../../config/server.json');

var router = require('express').Router();
var socket = require('socket.io-client').connect('ws://localhost:' + config.portws);

router.post('/', (req, res, next) => {
  let body = req.body;

  if(body != undefined){
    body = treatData(body);

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

router.post('/update',(req, res, next) => {
  let body = req.body;

  if (body != undefined){
    body = treatData(body);

    if (body.typeMessage == undefined || body._id == undefined){
      res.status(400).send();
    }else {
      const backKey = getBackKey(body);
      body.backKey = backKey;

      socket.once(backKey, (ret) => {
        res.status = 200;
        res.send(JSON.stringify(ret));
      });

      socket.emit('updateMessage', JSON.stringify(body));
    }
  }
});

router.post('/search', (req, res, next) => {
  let body = req.body;

  if (body != undefined){
    body = treatData(body);

    if (body.typeMessage == undefined)
      res.status(400).send();
    else{
      const backKey = getBackKey(body);
      body.backKey = backKey;

      socket.once(backKey, (ret) => {
        res.status(200).send(ret);
      });

      socket.emit('getMsg', JSON.stringify(body));
    }
  }
});

const getBackKey = (mess) => {
  return new Date().toISOString() + JSON.stringify(mess).substring(0,5);
}

const treatData = (data) => {
  if (typeof data == 'string')
    data = JSON.parse(data);

  return data;
}

module.exports = router;
