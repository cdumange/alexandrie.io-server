const AMQClient = require('chcn-ws-tools').AMQClient;
const config = require('../../config/server.json');

module.exports = () => {

  if (config.cfgAMQ != undefined){
      const amq = new AMQClient();
      const socket = require('socket.io-client').connect('ws://localhost:' + config.portws);

      config.cfgAMQ.queues.forEach((queue) => {
        if (queue.queue != undefined && queue.typeMessage != undefined){
          amq.AMQTopicWatcher('/queue/' + queue.queue, (body, headers) => {
            if (typeof body ==='string')
              body = JSON.parse(body);

            const msg = {
              typeMessage : queue.typeMessage,
              message : body
            }
            socket.emit('msg', msg);
          });
        }
      });
  }

}
