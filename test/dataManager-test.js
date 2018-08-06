const assert = require('assert');
const DataManager = require('../lib/dataManager');

process.on('unhandledRejection', (reason, promise) => {
  console.log('Unhandled Rejection at:', reason.stack || reason);
});

var dataManager = null;

describe('test dataManager', () => {
    before(async () => {
        //db = await mongo.getConn();
        dataManager = new DataManager();
    });

    it('getting filter from date', async () => {
        const filterDate = "6d";
        let now = new Date();
        const ret = await dataManager._getFilterFromTime(filterDate);
        now.setDate(now.getDate() -6);
        assert(ret != undefined 
            && new Date(ret.date.$lte).getDate() 
            == now.getDate());

        const filterMonth = "6m";
        now = new Date();
        now.setMonth(now.getMonth() -6);
        dataManager._getFilterFromTime(filterMonth).then((retM) => {
            console.log(retM);
            assert(retM != undefined 
                && new Date(retM.date.$lte).getMonth() 
                == now.getMonth());
    
            
        });
       
    });

    after(()=> {
        dataManager.closeAll();
    })
       
});