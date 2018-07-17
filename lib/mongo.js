const mongo = require('mongodb').MongoClient;
const config = require('../config/server');

const urlMongo = 'mongodb://'+ config.mongo.user +':' + config.mongo.pwd +
                '@' + config.mongo.host + ':' + config.mongo.port + '/' + config.mongo.db +
              '?authMechanism=DEFAULT&authSource=' + config.mongo.db + '&maxPoolSize=10&maxIdleTimeMS=1000';

function mongodb(){
  this.db = null;
  this.database = null;
}

mongodb.prototype.getConn = (table = config.mongo.db) => {
  if (this.db != null){
    return this.db;
  }
  else {
    const prom = new Promise((resolve, reject) => {
      if (process.env.debug)
        console.log(urlMongo);
      mongo.connect(urlMongo,{useNewUrlParser : true}, (err, database) =>{
        this.database = database;
        if(err != undefined) reject (err);
        this.db = database.db(table);
        resolve(this.db);
      });
    });
    return prom;
  }
}

mongodb.prototype.close = () => {
  this.database.close();
}

module.exports = {mongoClient : mongodb};
