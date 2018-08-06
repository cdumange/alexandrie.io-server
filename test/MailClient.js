const assert = require('assert');
const MailClient = require('../lib/MailClient');

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
    },
    autoDelete : true,
    alex: {
        mode: "ws",
        addressws: "srv-webdev",
        portws: 65123,
        address: 9514,
        suffix: ""
    },
    default: {
        typeMessage: 'exploit',
        origine: 'exploit',
        priority: 'info',
        words: [{
                key: 'error',
                level: 3,
                values: ['error', 'fatal', 'crash']
            },
            {
                key: 'warn',
                level: 2,
                values: ['warn', 'alert']
            },
            {
                key: 'success',
                level: 1,
                values: ['success', 'supercalifragilisticexpialidocious']
            }
        ]
    },
    specific: [{
            from: "mail@test",
            typeMessage: 'error',
            origine: 'error',
            priority: 'error'
        },
        {
            from: "mail@spec",
            typeMessage: 'exploit',
            origine: 'spec',
            priority: 'success',
            words: [
                {
                    key : 'warn',
                    level : 1,
                    origine : "superTest",
                    values : ["superTest"]
                },
                {
                    key: 'warn',
                    level: 3,
                    values: ['error', 'fatal', 'crash']
                },
                {
                    key: 'error',
                    level: 2,
                    values: ['warn', 'alert']
                },
                {
                    key: 'success',
                    level: 1,
                    values: ['success', 'supercalifragilisticexpialidocious']
                }
            ]
        }
    ]
}

let mail = null;

describe('Testing the assignment engine', () => {

    beforeEach(() => {
        mail = new MailClient(config);
    });

    it('testing default', async () => {
        let ret = mail._computeOrigine('test');
        assert(ret === 'exploit');

        ret = mail._computePriority('test', 'warn');
        assert(ret === 'warn');

        ret = mail._computePriority('test', 'error');
        assert(ret === 'error');

        ret = mail._computePriority('test', 'toto');
        assert(ret === 'info');
    });

    it('test specific, without words', async () => {
        let ret = mail._computeOrigine('mail@test');
        assert(ret === 'error');

        ret = mail._computePriority('mail@test', 'test');
        assert(ret === 'error');

        ret = mail._computePriority('mail@test', 'warn');
        assert(ret === 'error');
    });

    it('test specific, with words', async () => {
        let ret = mail._computeOrigine('mail@spec', 'test');
        assert(ret === 'spec');

        ret = mail._computeOrigine('mail@spec', 'superTest');
        assert(ret = 'superTest');

        ret = mail._computePriority('mail@spec', 'warn');
        assert(ret === 'error');

        ret = mail._computePriority('mail@spec', 'error');
        assert(ret === 'warn');

        ret = mail._computePriority('mail@spec', 'toto');
        assert(ret === 'success');

        ret = mail._computePriority('mail@spec', 'superTest error');
        assert(ret === 'warn');
    })

    afterEach(() => {
        if (mail)
            mail.close();
    });
});