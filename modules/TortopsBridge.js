
const https = require('https');
const TOKEN = process.env.TOKEN;
const os = require('os');


class TortopsBridge {
  constructor(token) {
    this.token = token;
  }
  /**
   * 
   * @param {string} server 
   * @param {*} data 
   * @returns 
   */
  request(server, path, data) {
    return new Promise((resolve, reject) => {
      data.token = this.token;
      const jsondata = JSON.stringify(data); console.log('data', jsondata, server, path);
      const req = https.request({
        hostname: server,
        port: 443,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': jsondata.length
        }
      }, (res) => {
        const chunks = [];
        res.setEncoding('utf8');
        res.on('data', chunk => {
          chunks.push(chunk);
        });
        res.on("end", () => {
          const fullContent = chunks.join('');
          let body = {};
          try {
            body = JSON.parse(fullContent);
          } catch (e) {
            body = fullContent;
          }
          resolve(body);
        });

      });
      req.on('error', err => {
        reject(err);
      });
      req.write(jsondata);
      req.end();
    }).catch(console.error);
  }

  async addRoute(server, uid_payload) {
    return await this.request(server, '/multiple/add-route', { uid_payload });
  }

  async getBoxes(server, payload) {
    return await this.request(server, '/multiple/get-box', { payload });
  }

  async addTeleopPayload(server, uid_ruta, uid_vehiculo, teleopId) {
    console.log(teleopId)
    return await this.request(server, '/multiple/add-route/teleop', { uid_ruta, uid_vehiculo, teleopId });
  }

  async getInformationObject(server, uid_ruta, uid_vehiculo, uid_teleoperador) {
    return await this.request(server, '/multiple/get-information', { uid_ruta, uid_vehiculo, uid_teleoperador });
  }

  async getLinkedPayload(server, payload) {
    console.log(payload)
    const body = {
      payload
    }
    console.log(body)
    return await this.request(server, '/multiple/get-linked/teleop', body);
  }

  async getDeliver(server, uid_ruta) {
    return await this.request(server, '/multiple/get-deliver', { uid_ruta });
  }

  async closePayload(server, uid_payload) {
    return await this.request(server, '/multiple/close-payload', { UID_PAYLOAD: uid_payload });
  }

  async deliveryNext(server, uid_ruta, imei, uid_teleoperador) {
    console.log('delivery next', server, uid_ruta, imei, uid_teleoperador)
    const res = await this.request(server, '/multiple/next', { uid_ruta, imei, uid_teleoperador });
    console.log('result ==> ', res)
    return res
  }

  async closeDeliver(server, uid_ruta) {
    return await this.request(server, '/multiple/closeDeliver', { uid_ruta });
  }
  async cancelDeliver(server, uid_ruta) {
    return await this.request(server, '/multiple/cancel-deliver', { uid_ruta });
  }
  async endSession(server, uid_ruta) {
    return await this.request(server, '/multiple/end-route', { uid_ruta });
  }
}


module.exports = new TortopsBridge(TOKEN);
