
const INTERFACE_SERVER = 'yourserver.com';
const TOKEN = 'yourtoken';

const https = require('https');
const querystring = require('querystring');

class InterfaceBridge {
  constructor(vehicle_server, token) {
    this.vehicle_server = vehicle_server;
    this.token = token;

  }

  postRequest(path, data) {
    return new Promise((resolve, reject) => {
      data.Token = this.token;
      const stringdata = querystring.stringify(data);
      const req = https.request({
        hostname: this.vehicle_server,
        port: 443,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': stringdata.length
        }
      }, (res) => {
        const chunks = [];
        res.setEncoding('utf8');
        res.on('data', chunk => {
          // console.log(chunk);
          chunks.push(chunk);
        });
        res.on("end", () => {
          const body = JSON.parse(chunks.join(''));
          resolve(body);
        });

      });
      req.on('error', err => {
        reject(err);
      });
      req.write(stringdata);
      req.end();
    });
  }
  deliveryPost(UnitID, lat, lon, phone, storage) {
    return this.postRequest('/delivery/' + UnitID, {
      Latitude: lat,
      Longitude: lon,
      Cellphone: phone,
      Storage: storage
    });
  }
}


module.exports = new InterfaceBridge(INTERFACE_SERVER, TOKEN);