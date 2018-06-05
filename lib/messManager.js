const config = require('../config/messageManager');
const ObjectID = require('mongodb').ObjectID;

function MessageManager (dba){
  var db = dba;

  this._createMessage = async function(data) {
    let mess = {
      typeMessage : data.typeMessage,
      counter : 1,
      date : new Date(),
      origine : data.origine,
      priority : (data.priority != undefined) ? data.priority : 1,
      message : data.message
    };

    if(data.filter != undefined)
      mess.filter = data.filter;

    if(process.env.debug)
      console.log(mess);

    return new Promise((resolve) => {
      getCollectionForTypeMessage(data.typeMessage).then((col) => {
         db.collection(col).insertOne(mess).then((retour) => {
           resolve(mess);
         });
      });
    });
  }

  this._getMess = async function (typeMessage, filter){
    return new Promise((resolve, reject) => {
      getCollectionForTypeMessage(typeMessage).then((col) => {

        debug('recherche des données sur ' + col);
        debug('filtre de recherche : ');
        debug(filter);

        const iter = db.collection(col).find(filter);
        iter.toArray((err, mess) => {
          if (err != undefined)
            return reject(err);

          resolve(mess);
        });
      });
    });
  }

  this._updateMess = async (typeMessage,_idmess, updateReq) => {
    return new Promise((resolve, reject) => {
      getCollectionForTypeMessage(typeMessage).then((col) => {
        let filter = {
          _id : ObjectID(_idmess)
        };
        debug(filter);
        db.collection(col).updateOne(filter,{$set : updateReq}, {upsert : false}).then((retour) => {
          debug(retour.result)
          resolve(retour.result.n);
        });
      });
    });
  }

  this._deleteMess = async (typeMessage, _idMess) => {
    return new Promise((resolve, reject) => {
      if (typeMessage == undefined || _idMess == undefined)
        reject(new Error('Paramètre de suppresion du message incorrect'));

      getCollectionForTypeMessage(data.typeMessage).then((col) => {
        db.collection(col).deleteOne({_id : _idMess},(err, retour) => {
          if (err != undefined)
            reject(err);
          else
            resolve (retour.acknowledged);
        });
      });
    });
  }

  this._deleteManyMess = async (filter) => {
    return new Promise((resolve, reject) => {
      if (filter.typeMessage == undefined)
        reject(new Error('Paramètre de suppresion du message incorrect'));

      getCollectionForTypeMessage(filter.typeMessage).then((col) => {
        db.collection(col).deleteMany(filter,(err, retour) => {
          if (err != undefined)
            reject(err);
          else{
            resolve (retour.result.n);
          }
        });
      });
    });
  }

  this._manageGrouping = async (mess, policie) => {
    return new Promise((resolve, reject) => {
      if (mess == undefined || policie == undefined)
        reject(new Error('Paramètre manageGrouping incorrect'));

      let dateN = new Date();
      const indexD = policie.delay.indexOf('d');
      const indexH = policie.delay.indexOf('h');
      const indexM = policie.delay.indexOf('m');

      if (indexD > 0)
        dateN.setUTCDate(dateN.getUTCDay() - policie.delay.substring(0,indexD));

      if (indexH > 0){
        let start = 0;
        if (indexD > 0)
          start = indexD +1;
        dateN.setUTCHours(dateN.getUTCHours() - policie.delay.substring(start, indexH));
      }

      if (indexM > 0){
        let start = 0;
        if (indexD > 0)
          start = indexD +1;

        if (indexH > 0)
          start = indexH +1;

        dateN.setUTCHours(dateN.getUTCHours() - policie.delay.substring(start, indexM));
      }

      //récupération des messages ayant le même message + date dans le cadre.
      this._getMess(mess.typeMessage,
        {"message" : mess.message, "date" : {"$gte" : dateN}}).then((messPrec) => {

        //si pas de message, on le créé
        if (messPrec == undefined || messPrec.length == undefined || messPrec.length <= 0)
          resolve(this._createMessage(mess));
        else {
          //sinon, counter ++
          messPrec = messPrec[0];
          messPrec.counter ++;
          const updateReq = {counter : messPrec.counter};
          this._updateMess(mess.typeMessage, messPrec._id, updateReq ).then((retour) => {
            if (retour > 0)
              resolve(messPrec);
            else {
              reject(retour);
            }
          });
        }
      });
    })
  }

  this.createMess = async function (data) {
    return new Promise((resolve, reject) => {
      const messValid = checkMessage(data);
      const messPass = checkExclusions(data);

      Promise.all([messValid, messPass]).then((values) => {
        //si je passe les tests de qualif du message
        if (values[0] && values[1]){
          if (process.env.debug){
            console.log('Format & exclusion ok');
          }

          //test si file de test
          if (data.typeMessage===config.testType)
            resolve(true);

          //Essaie de récupération de l'origine dans le corps du message (legacy)
          if (data.origine == undefined){
            data.origine = "";
            if(typeof data.message  === 'string') {
              try{
                const mess = JSON.parse(data.message);
                data.origine = mess.origine;
              }catch(e){
                //nothing to do
              }
            }
          }

          getTypeMessageFromConfig(data.typeMessage).then((type) => {
            if (type.group != undefined){
              resolve(this._manageGrouping(data, type.group));
            }
            else
              resolve(this._createMessage(data));
          });
        }
        else {
          //sur un message incorrect, on retourne null
          resolve(null);
        }
      })
      .catch((err) => {
        throw err;
      });
    });
  }

  this.getMessages = async (typeMessage, filter) => {
    return new Promise((resolve, reject) => {

      let dateR = null;
      if(filter.date != undefined){
        dateR = new Date(Date.parse(filter.date));
      }
      else {
        dateR = new Date();
        dateR.setUTCHours(dateR.getUTCHours() -24);
      }

      let filt = {
        date : {
          $gte : dateR
        }
      };
      //si on a pas de date
      if (filter.dateD != undefined){
        filt.date.$gte = new Date(Date.parse(filter.dateD));
      }

      if(filter.dateF != undefined){
        filt.date["$lte"] = new Date(Date.parse(filter.dateF));
      }

      if (filter.priority != undefined){
        filt["priority"] = filter.priority;
      }

      if (filter.origine != undefined){
        filt['origine'] = filter.origine;
      }

      if (filter.message != undefined){
        filt['message'] = filter.message;
      }

      const mess = this._getMess(typeMessage, filt);

      if (mess == undefined)
        reject('Message non trouvé');

      resolve(mess);
    });
  }

  this.getDefaultCache = (typeMessage) => {
    let dateN = new Date();
    dateN.setUTCHours (dateN.getUTCHours() -1);

    const defaultCacheFilter = {"date" :{"$gt" : dateN  }};

    return this._getMess(typeMessage, defaultCacheFilter);
  }

  this.updateMessage = async (message) => {
    return new Promise((resolve, reject) => {
      if (message.typeMessage == null || message._id == null) return reject('Message format incorrect');

      const id = message._id;
      const typeMessage = message.typeMessage;

      //Suppression de certains champs qui ne sont jamais mis à jour
      delete message._id;
      delete message.date;
      delete message.typeMessage;
      debug('maj')
      debug(message);

      return resolve(this._updateMess(typeMessage, id, message));
    });
  }

  this.deleteForFilter = async (filter) =>{
    return new Promise((resolve, reject) => {
      if (filter == undefined || typeof filter != "object") return reject(new Error('Bad parameters'));
      if (filter._id != undefined) return resolve(this._deleteMess(filter.typeMessage, filter._id));
      else resolve(this._deleteManyMess(filter));
    })
  }
  this.deleteMessage = async (mess) => {
    return new Promise((resolve, reject) => {
      if (mess.typeMessage == undefined || mess._id == undefined){
        return reject(new Error('unformatted message'));
      }else{
        resolve(this._deleteMess(mess.typeMessage, mess._id));
      }
    });
  }
}

//vérification du format du message, de son bon passage
const checkMessage = (data) => {
  return new Promise((resolve, reject) => {
    if (typeof data != 'object')
      reject(new Error('type de paramètre incorrect'));
    if (data.typeMessage == undefined || data.message == undefined)
      reject(new Error('message recu non conforme. typeMessage ou message absente'));

    resolve(true);
  });
}

const checkExclusions = (data) => {
  return new Promise((resolve) => {
    //si pas d'exclusion, return true
    if (data.exclusions == undefined)
      resolve (true);

    let pass = true;
    //calcul des exclusions
    Promise.all(data.exclusion.map(checkExclusion), data).then((results) => {
      for (let n = 0; n < results.length; n++){
        pass &= results[n];
      }

      resolve(pass);
    });
  });
}
//Vérification des exclusions. false si exclue, true si passe
const checkExclusion = (exclusion) => {
  return new Promise((resolve, reject) => {
    //vérification de la présence des champs
    if (exclusion.champs == undefined || exclusion.operator == undefined || exclusion.value == undefined)
      reject(new Error('Format de l\'exclusion incorrect'));

    const mess = this.message;

    if (mess[exclusion.champs] == undefined)
      reject(new Error('colonne d\'exclusion non présente'));

    const messValue = mess[exclusion.champs];
    const testValue = exclusion.value;
    //par défaut, non exclusion
    let retour = false;
    switch(exclusion.operator){
      case '=' :
        retour = (messValue === testValue);
        break;
      case '!=' :
        retour = (messValue != testValue);
        break;
      case "IN" :
        retour = (messValue.indexOf(testValue) >= 0);
        break;
    }
    //retourne !retour pour suivre une valeur logique
    resolve(!retour);
  })
}

const getCollectionForTypeMessage = async (typeMessage) => {
  return getTypeMessageFromConfig(typeMessage).then((type) => {
    return type.collection;
  });
}

const getTypeMessageFromConfig = (typeMessage)=> {
  return new Promise((resolve, reject) => {
    if (config == undefined || config.typeList == undefined)
      reject(new Error('fichier de config non trouvé'));

    let typeMess = config.typeList.filter((type) => {
      return type.typeMessage ===typeMessage;
    });

    if (typeMess == null || typeMess.length == 0 || typeMess.length > 1)
      return reject(new Error('Type Message non/mal configuré : ' + typeMessage));

    typeMess = typeMess[0];

    resolve (typeMess);
  });
}

const debug = (text) => {
  if(process.env.debug)
    console.log(text);
}

module.exports = MessageManager;
