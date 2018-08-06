const MailConsumer = require("./connectors/MailConsumer");
const logger = require("alexandrie.io-node");

const MailClient = function(config) {
  this._config = config;
  this._checkDefaults();
  debug("Starting the mail client");
  this.mailer = new MailConsumer(this._config);
};

MailClient.prototype._checkDefaults = function() {
  if (
    !this._config.imap.host ||
    !this._config.imap.user ||
    !this._config.imap.password ||
    !this._config.default.origine ||
    !this._config.default.typeMessage
  )
    throw new Error(
      "Erreur de configuration, champs min : host, user, password, orgine, typeMessage"
    );

  this._config.prioFilter = this._config.prioFilter || {
    warn: ["warn"],
    info: ["info"],
    error: ["error"]
  };

  this._config.onmail = this._onMail.bind(this);
  this._config.autoConnec = this._config.autoConnect || true;
  this._config.imap.inbox = this._config.imap.inbox || 'INBOX';
  this._config.autoDelete = this._config.autoDelete || false;
};

MailClient.prototype._onMail = async function(numNewMail) {
  const mails = await this.mailer.getUnreadMail();
  mails.forEach(mail => {
    const header = mail.parts.filter(p => p.which === "HEADER")[0];
    const body = mail.parts.filter(p => p.which === "TEXT")[0];

    const mess = this._computeMessage(header, body);


    if (this._config.autoDelete){
       this.mailer.deleteMail(mail.attributes.uid)
       .then((ret) => {
        console.log(ret);
        });
    }
  });
};

MailClient.prototype._computeMessage = function(header, body) {
  const isHTML = header.body["content-type"][0].indexOf("html") >= 0;

  let text = body.body;

  if (isHTML) {
    const posD = text.indexOf("<html>");
    const posF = text.indexOf("</html>");

    text = text.substring(posD, posF);
  }
  const from = header.body.from;

  const alexMess = {
    typeMessage: this._computeTypeMessage(from),
    origine: this._computeOrigine(from, text),
    priority: this._computePriority(from, text),
    message: text
  };

  logger.getInstance().sendMessage(alexMess);
};

/**
 * Function checking if the from is in the specific list and returning the first one
 */
MailClient.prototype._computeOrigine = function(from, text) {
  const listSpec = this._config.specific
    ? this._config.specific.filter(s => s.from === from)
    : null;
  if (listSpec && listSpec.length > 0) {
    const spec = this._computeForListWords(text, listSpec[0].words);
    if (spec && spec.origine) return spec.origine;
    else return listSpec[0].origine;
  } else {
    return this._config.default.origine;
  }
};

/**
 * Function checking if the from is in the specific list and returning the first one
 */
MailClient.prototype._computeTypeMessage = function(from) {
  const listSpec = this._config.specific
    ? this._config.specific.filter(s => s.from === from)
    : null;
  if (listSpec && listSpec.length > 0) {
    return listSpec[0].typeMessage;
  } else {
    return this._config.default.typeMessage;
  }
};

/**
 * Function computing the priority for a from & a text
 * @param {string} from email address to be check against config
 * @param {string} text text to be analyzed
 */
MailClient.prototype._computePriority = function(from, text) {
  const listSpec = this._config.specific
    ? this._config.specific.filter(s => s.from === from)
    : null;

  let listWords, defaultPrio;

  if (listSpec && listSpec.length > 0) {
    listWords = listSpec[0].words;
    defaultPrio = listSpec[0].priority;
  } else {
    listWords = this._config.default.words;
    defaultPrio = this._config.default.priority;
  }

  const spec = this._computeForListWords(text, listWords, defaultPrio);
  if (spec && spec.key) return spec.key;
  else return defaultPrio;
};

MailClient.prototype.close = function() {
  if (this.mailer) {
      this.mailer.close();
  }
};

/**
 * Function computing a map key/values ( { key : 'info', values : ['test', 'info'], level : 3}) and returning the
 * @param {string} text The text to evaluate
 * @param {map} mapWords The object to evaluate the text
 */
MailClient.prototype._computeForListWords = function(text, mapWords) {
  //if no mapWords -> null
  if (mapWords == undefined) return null;
  //mapping the values to a boolean
  let map = mapWords.map(prio => {
    let ret = {};
    ret.key = prio.key;
    ret.level = prio.level;

    let is = false;
    prio.values.forEach(w => (is |= text.indexOf(w) >= 0));
    ret.values = is;

    return ret;
  });
  //filtering on the boolean + sorting on level
  map = map.filter(w => w.values).sort(function compare(a, b) {
    return a.level - b.level;
  });

  //returning the first one
  if (map.length > 0) return map[0];
  else return null;
};

function debug(text) {
  if (process.env.debug) {
    console.log(text);
  }
}

module.exports = MailClient;
