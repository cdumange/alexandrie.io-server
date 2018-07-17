const assert = require('assert');
const mongoClient = require('../lib/mongo').mongoClient;
const mongo = new mongoClient();
const DataManager = require('../lib/dataManager');

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason);
});

var dataManager = null;

describe('test dataManager', () => {
    before(async () => {
        db = await mongo.getConn();
        dataManager = new DataManager(db);
    });

    it('getting filter from date', async () => {
        const filterDate = "6d";
        const ret = await dataManager._getFilterFromTime(filterDate);
        console.log(ret);
        assert(ret != undefined 
            && new Date(ret.date.$lte).getDate() 
            == ((new Date()).getDate() -6));

        const filterMonth = "6m";
        const retM = await dataManager._getFilterFromTime(filterMonth);
        console.log(retM);
        assert(retM != undefined 
            && new Date(retM.date.$lte).getMonth() 
            == ((new Date()).getMonth() -6));
    });
});