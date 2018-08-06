const configC = require('../config/dataManager');
const config = require('../config/messageManager.json');

const CronJob = require('cron').CronJob;

const DEFAULT_CLEANING = 'default';
const CRON_TEMPLATE = configC.cronTemplate;
const TimeEnum = {
    day: "d",
    month: "m"
}

function DataManager(messageManager) {
    var messManager = messageManager;
    this.mapCron = new Map();

    this._getFilterFromTime = async function (time) {
        return new Promise((resolve, reject) => {
            if (time == undefined || time == "") return reject(new Error('temps non définit pour ce typeMessage'));
            const reg = /[0-9][mMdD]/;

            if (time.match(reg)) {
                const val = time[0];
                const symbol = time[1];

                const dateF = new Date();
                switch (symbol.toLowerCase()) {
                    case TimeEnum.day:
                        dateF.setDate(dateF.getDate() - val);
                        break;
                    case TimeEnum.month:
                        dateF.setMonth(dateF.getMonth() - val);
                        break;
                }
   
                return resolve({
                    date: {
                        $lte: dateF
                    }
                });
            } else {
                return reject(new Error('Chaîne de caractère de temporailité incorrect : ' + time));
            }

        });
    }

    this.clearTypeMessage = async function (typeMess, time) {
        console.log('Je vais tout nettoyer chez ' + typeMess);
        //récupération du filtre temporel
        let filter = await this._getFilterFromTime(time);
        //ajout du typeMessage
        filter.typeMessage = typeMess;
        //suppression
        console.log(filter);
        return messManager.deleteForFilter(filter);
    }

    //we have a config
    if (config != undefined) {

        //launching the table cleaning
        if (configC.cleaning != undefined) {
            const listCleaning = configC.cleaning;
            const listTypeMessage = config.typeList;
            //creation the cleaning map from list
            const mapCleaning = new Map();
            listCleaning.forEach(item => {
                mapCleaning.set(item.typeMessage, item.value);
            });

            //creating cron for each typeMessage
            listTypeMessage.forEach(itemType => {
                let value = mapCleaning.get(itemType.typeMessage);
                if (value == undefined) {
                    value = mapCleaning.get(DEFAULT_CLEANING)
                }
                if (value != undefined) {
                    this.mapCron.set(itemType.typeMessage, 
                        new CronJob({
                            cronTime : CRON_TEMPLATE, 
                            onTick : function () {
                                console.log('coucou');
                                this.clearTypeMessage(itemType.typeMessage, value);
                            },
                            start: true,
                            context : this
                        }));
                }
            });
        }
    }
}

DataManager.prototype.closeAll = function () {
    this.mapCron.forEach(c => c.stop());
}


module.exports = DataManager;