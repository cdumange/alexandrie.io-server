var express = require('express');
var app = express();

const config = require('../../config/server');

let socIO = app.listen(config.portws, '0.0.0.0', function (){
  console.log('ws listenning on ' + config.portws);
})

var io = require('socket.io');
var socket = io(socIO, {origins : '*:*' });

module.exports = (messManager) => {

  socket.on('connect', (soc) => {
    debug('connect');
    //Réception du message sur le ws
    soc.on('msg', async (data, headers) => {
      //on broadcast le message
      data = await treatData(data);
      messManager.createMess(data).then((msg) => {
        soc.broadcast.emit('msg', msg);
      });
    });
    //demande de recherche de fichier
    soc.on('getMsg', async (data, headers) => {
      let filter = await treatData(data);
      if (filter.backKey == undefined || filter.typeMessage == undefined)
        soc.emit('nOK');
      else{
        const backKey = filter.backKey;
        delete filter.backKey;

        messManager.getMessages(filter.typeMessage, filter).then((resp) => {
          soc.emit(backKey, resp);
        });
      }

    });
    //demande de cache
    soc.on('requestcache', async (data, headers) => {
      data = await treatData(data);
      debug('demande de cache');

      if (data.date == undefined && data.dateD == undefined && data.dateF == undefined){
        data.date = new Date().setUTCHours(dateR.getUTCHours() -24);
      }

      if(data.typeMessage != undefined){

        messManager.getMessages(data.typeMessage,data)
          .then((list) => {
            debug('taille du retour : ' + list.length);
            soc.emit('resCache', list);
          });
      }

    });
    //update de messages
    soc.on('updateMessage', async(data, headers) => {
      let message = await treatData(data);
      if (message._id == undefined || message.backKey == undefined)
        soc.emit('nOK');
      else {
        const backKey = message.backKey;
        delete message.backKey;

        messManager.updateMessage(message).then((resp) => {
          soc.emit(backKey, resp);
        });
      }
    });
    //demande de la liste des type de messages
    soc.on('reqListChan', (data, headers) => {
      debug ('demande de la liste des chan');
      const chan = require('../../config/messageManager');
      let listChan = [];
      //recupération de la liste des channels
      for (let n = 0; n< chan.typeList.length; n++){
        listChan.push(chan.typeList[n]);
      }
      //envoi au demandeur
      soc.emit('listChan', listChan);
      debug('envoi de ' + listChan.length + ' elements');
    })
  });
}

const treatData = (data) => {
  return new Promise((resolve) => {
    if (typeof data ==='string')
      data = JSON.parse(data);
    resolve(data);
  });
}


function debug(test){
  if(process.env.debug)
    console.log(test);
}
