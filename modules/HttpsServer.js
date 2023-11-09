/* global __dirname */
require('colors');
const path = require('path');
const fs = require('fs');
const https = require('https');

const config = require('../config/config.js');

const { certFn, privKeyFn } = require('../config/ssl')
const sslChecker = require('ssl-checker')

const getSslDetails = async (hostname) => await sslChecker(hostname)

// async function createServer(app, port) {
//     const check = await getSslDetails('tortops.com')
//     if (check.dayRemaining < 10) {
//         const cert = await certFn()
//         const priv = await privKeyFn()
//         if (cert && priv) {
//             service(app, port)
//         }
//         return
//     }
//     service(app, port)
// }

function createServer(app, port) {
  try {
    let httpsServer;
    const sslpath = config.SSL_PATH ? config.SSL_PATH : path.join(__dirname, 'sslcert');

    const privateKey = fs.readFileSync(path.join(sslpath, 'privkey.pem'), 'utf8');
    const certificate = fs.readFileSync(path.join(sslpath, 'cert.pem'), 'utf8');
    const chainBundle = fs.readFileSync(path.join(sslpath, 'chain.pem'), 'utf8');

    const credentials = {
      key: privateKey,
      cert: certificate,
      ca: chainBundle,
      ciphers: [
        "ECDHE-RSA-AES256-SHA384",
        "DHE-RSA-AES256-SHA384",
        "ECDHE-RSA-AES256-SHA256",
        "DHE-RSA-AES256-SHA256",
        "ECDHE-RSA-AES128-SHA256",
        "DHE-RSA-AES128-SHA256",
        "HIGH",
        "!aNULL",
        "!eNULL",
        "!EXPORT",
        "!DES",
        "!RC4",
        "!MD5",
        "!PSK",
        "!SRP",
        "!CAMELLIA"
      ].join(':')
    };
    const helmet = require('helmet');
    const ONE_YEAR = 31536000000;
    if (app) {
      app.use(helmet.hsts({
        maxAge: ONE_YEAR,
        includeSubDomains: true,
        force: true
      }));
      httpsServer = https.createServer(credentials, app);
    } else {
      httpsServer = https.createServer(credentials);
    }
    if (port) {
      httpsServer.listen(port);
      console.log('HTTPS running in port '.green + port);
    }
    // const signalServer = require('./signalServer.js');
    // signalServer(httpsServer);

    return httpsServer;
  } catch (err) {
    console.error(err)
  }
}

module.exports = createServer;
