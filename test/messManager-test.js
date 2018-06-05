const assert = require('assert');
const mongoClient = require('../lib/mongo').mongoClient;
const mongo = new mongoClient();
const MessageManager = require('../lib/messManager');

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason);
});

//process.env.debug = true;
const filter = {
  filter : "test"
};

const mess = {
  typeMessage : "error",
  filter : "test",
  message : {
    message : "ceci est une erreur de test",
    stack : "pareil"
  }
};

let MessEnr = null;
let db = null;
let messManager = null;

describe('Test du messageManager', () => {
  before (async() => {
    db = await mongo.getConn();
    messManager = new MessageManager(db);
  });

  it('Creating a new message' , async () => {
    const messR = await messManager.createMess(mess);
    assert.ok (messR != undefined);
    assert.ok (messR.message.message === mess.message.message);
  });

  it('Recreating a new message' , async () => {
    const messR = await messManager.createMess(mess);
    assert.ok (messR != undefined);
    assert.ok (messR.message.message === mess.message.message);
  });

  it('Getting message', async() => {
    let list = await messManager.getMessages("error",filter);

    assert.ok(list != undefined);
    assert.ok(list.length != undefined);
    assert.ok(list.length > 0);
    MessEnr = list[0];
  })

  it('updating Message', async() =>{
    let messMod = MessEnr;
    messMod.modified = "true";

    let ret = await messManager.updateMessage(messMod);
    assert.ok(ret != undefined);
    assert.ok(ret);
  });

  it('deleting Message', async() => {
    let fil = filter;
    fil.typeMessage = "error";
    let ret = await messManager.deleteForFilter(filter);
    assert.ok(ret != undefined);
    assert.ok(ret > 0);
  })



  after(async() => {
    mongo.close();
  });


});
