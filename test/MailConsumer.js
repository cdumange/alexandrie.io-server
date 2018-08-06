const assert = require('assert');
const MailConsumer = require('../lib/connectors/MailConsumer');

const config = {
    imap: {
        user: "",
        password: "",
        host: "",
        port: 143,
        autotls: 'required',
        tls: false,
        authTimeout: 20000,
        tlsOptions: {
            rejectUnauthorized: false
        }
    }
}

let mail;

describe('Test du client de récupération de mail', () => {

    before(() => {
        mail = new MailConsumer(config);
    })

    it('test de connection', async () => {
        const conn = await mail.connect();
        assert(conn);
        conn.end();
    });

    it('open an inbox', async () => {
        await mail.connect();
        await mail.openBox();
    });

    it('getting unread mail', async () => {
        await mail.connect();
        await mail.openBox();

        const res = await mail.getUnreadMail();
        assert(res);
        //if a mail, try to delete it
        if (res.length > 0){
            const m = res[0];
            assert(m);
            const ret = await mail.deleteMail(m.attributes.uid);
            assert(!ret);
        }
    });

    it('getting mail with xxx', async () => {
        await mail.connect();
        await mail.openBox();

        mail.search("hexa").then((res) => {
            assert(res && res.length > 0);
        });
    });

    afterEach(() => {
        if (mail)
            mail.close();
    })

})