const imaps = require('imap-simple');

const FLAG_DELETED = ['\\Deleted'];

const MailConsumer = function (config){

    this._config = config;
    this._checkDefault();   
    this.isBoxOpened = false; 
    this.isConnected = false;

    if (this._config.autoConnec){
        this.connect().then((conn) => {
            this.openBox();
        });
        
    }
}

MailConsumer.prototype.connect = function () {
    return new Promise((resolve, reject) => {
        if (this.isConnected) return resolve (this._conn);

        imaps.connect(this._config)
        .then((conn) => {
            this.isConnected = true;
            this._conn = conn;
            return resolve(this._conn);
        })
        .catch(err => reject (err));
    });
}

MailConsumer.prototype.close = function () {
    if (this._conn != undefined){
        this._conn.end();
        this._conn = null;
        this.isBoxOpened = false;
        this.isConnected = false;
    }
}

/**
 * Function fetching all the unread mail
 */
MailConsumer.prototype.getUnreadMail = function () {
    return this._search(['UNSEEN']);
}

/**
 * Function fetching an email having the corresponding UID
 * @param {int} uid The UID to find
 */
MailConsumer.prototype.getMailForUID = function (uid) {
    return this._search([['UID',uid]]);
}

/**
 * Function searching the passed string in the body
 * @param {string} txtToSearch 
 */
MailConsumer.prototype.search = function(txtToSearch) {
    return this._search ([['BODY', txtToSearch]]);
}

/**
 * Generic function using node-imap criterias
 * @param {tab} searchCriteria the criterias corresponding to node-imap criterias format
 */
MailConsumer.prototype._search = function (searchCriteria, options) {
    return new Promise((resolve) => {
        resolve(this._conn.search(searchCriteria, options || this._config.imap.searchOptions));
    })
}

MailConsumer.prototype.openBox = function (inbox = this._config.imap.inbox){
    return new Promise((resolve, reject) => {
        if (!this._conn) return resolve(this.connect());
        resolve(this._conn.openBox(inbox));
    });
}

MailConsumer.prototype._checkDefault = function () {

    this._config.imap.port = this._config.imap.port || 143;
    this._config.imap.tls = this._config.imap.tls || false;
    this._config.imap.authTimeout = this._config.imap.authTimeout || 10000;
    this._config.imap.searchOptions = {bodies: ['HEADER', 'TEXT'], markSeen: true}
    this._config.imap.inbox = this._config.imap.inbox || 'INBOX';
    this._config.deletedBox = this._config.deletedBox || 'Éléments supprimés';
}

MailConsumer.prototype.deleteMail = function (uid){
    const errF = this._conn.addFlags(uid, FLAG_DELETED);
    const errM = this._conn.moveMessage(uid, this._config.deletedBox);

    return errM || errF || true;
}

function debug(text){
    if (process.env.debug){
        console.log(text);
    }
}

module.exports = MailConsumer;

