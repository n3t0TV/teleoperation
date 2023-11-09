const argv = require('./Arguments')
const VEHICLE_SERVER = argv.vehicleServer || process.env.VEHICLE_SERVER;
const VEHICLE_MQTT_PORT = argv.vehicleMqttPort || process.env.VEHICLE_MQTT_PORT;
const VEHICLE_HTTP_PORT = argv.vehicleHttpsPort || process.env.VEHICLE_HTTP_PORT;
const TOKEN = process.env.TOKEN;
const https = require('https');
const mqtt = require('mqtt');
const os = require('os');
const { response } = require('express');

class Vehicle {
  constructor(data) {
    this.id = data.id || data.uid;
    this.imei = Number(data.imei);
    this.update(data);
  }
  update(data) {
    this.battery = Number(data.battery);
    this.gps = {
      'lat': Number(data.gps.lat),
      'lon': Number(data.gps.lon),
      'alt': Number(data.gps.alt)
    };
    
    this.type = data.type;
    this.versions = data.versions;
    this.rssi = Number(data.rssi);
    this.status = Number(data.status);
    this.timestamp = data.timestamp || data.heartbeatTimestamp;
    this.connected = data.connected;
    this.mqtt = data.mqtt;
    this.http = data.http;
    this.operatorId = data.operatorId;
    this.operatorName = data.operatorName;
    this.remoteIt = data.remoteIt;
    this.server = data.connection || {};
    this.teleop = data.teleop;

    this.brainBranch = data.brain_branch;
    this.brainCommit = data.brain_commit;
    this.runningSource = data.running_source;

  }
}


class VehicleBridge {
  constructor(vehicle_server, token) {
    this.vehicle_server = vehicle_server;
    this.token = token;
    this.updateCallback=false;
    this.mqttClientId = `${os.hostname()}`;
    console.log('Connecting MQTT...'.cyan);
    console.log(`mqtts://${VEHICLE_SERVER}:${VEHICLE_MQTT_PORT}`);
    this.mqttClient = mqtt.connect(`mqtts://${VEHICLE_SERVER}:${VEHICLE_MQTT_PORT}`,
      {
        username: this.mqttClientId,
        password: TOKEN
      }
    );
    /** @type {Object<string,Vehicle>} */
    this.vehicles = {};
    /** @type {Array<function>} */
    this.callbacks = [];
    this.subscriptions = {};
    this.mqttClient.on('connect', this.mqttOnConnect.bind(this));
    this.mqttClient.on('message', this.mqttOnMessage.bind(this));
    this.mqttClient.on('close', this.mqttOnClose.bind(this));
  }

  mqttOnConnect() {
    console.log('MQTT connected to'.green, `mqtts://${VEHICLE_SERVER}:${VEHICLE_MQTT_PORT}`);
    this.mqttClient.subscribe('vehicles/all/update', err => {
      if (err) return console.error('Suscription error');
      console.log('MQTT client subscribed to'.green, 'vehicles/all/update');
    });
    /*this.mqttClient.subscribe('communication', err => {
      if (err) return console.error('Suscription error');
      console.log('MQTT client subscribed to'.green, 'communication');
    });*/


  }

  mqttOnMessage(topic, message, packet) {
    const data = JSON.parse(message.toString());
    const subtopics = topic.split('/');
    //const modifiedTopic = this.topic ? this.topic.split('/') : '';
    if(this.updateCallback)
        this.updateCallback(data, subtopics);

    switch (subtopics[0])
    {
      case 'vehicles':
        const updated = [];
        for (const vehicledata of data) {
          if (!this.vehicles[vehicledata.imei]) {
            this.vehicles[vehicledata.imei] = new Vehicle(vehicledata);
          } else {
            this.vehicles[vehicledata.imei].update(vehicledata);
          }
          updated.push(this.vehicles[vehicledata.imei]);

        }
        //console.log('Callbacks: ',this.callbacks);
        for (const callback of this.callbacks) {
          callback(this, updated);
        }
        break;

      case 'heartbeat':
        if (!this.vehicles[data.imei]) {
          this.vehicles[data.imei] = new Vehicle(data);
        } else {
          this.vehicles[data.imei].update(data);
        }
        for (const callback of this.callbacks) {
          callback(this, [this.vehicles[vehicledata.imei]]);
        }
        break;
    }

    const topics = Object.keys(this.subscriptions);
    for (const topic of topics) {
      if (topic === topic) {
        this.subscriptions[topic].callback(message.toString());
      }
    }

  }
  mqttOnClose() {
    console.log('MQTT connection closed'.red);
  }

  mqttPublish(topic, data, options) {
    return new Promise((resolve) => {
      this.mqttClient.publish(topic, data, options, resolve);
    });
  }

  mqttInstruction(imei, data) {
    return new Promise(resolve => {
      const jsonData = JSON.stringify(data);
      this.mqttPublish(`instruction/${imei}`, jsonData, { 'qos': 2 }).then(resolve);
    });
  }
  /**
   * Register MQTT callback for update event
   * @param {function(VehicleBridge,Array<Vehicle>)} callback
   */
  registerMQTTCallback(callback) {
    this.callbacks = push(callback);
  }

  /**
   * @type {Array<Vehicle>}
   */
  get vehicleList() {
    const arr = [];
    for (let uid in this.vehicles) {
      arr.push(this.vehicles[uid]);
    }
    return arr;
  }

  getConnectedList(status) {
    const arr = [];
    for (let uid in this.vehicles) {
      if (this.vehicles[uid].connected) {
        if (status) {
          if (Number(status) !== this.vehicles[uid].status) {
            continue;
          }
        }
        arr.push(this.vehicles[uid]);
      }
    }
    return arr;
  }

  request(data) {
    return new Promise((resolve, reject) => {
      data.token = this.token;
      const jsondata = JSON.stringify(data); console.log('data', jsondata);
      console.log('***backend vehicle request***',this.vehicle_server)
      const req = https.request({
        hostname: this.vehicle_server,
        port: VEHICLE_HTTP_PORT,
        path: '/api',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': jsondata.length
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
      req.write(jsondata);
      req.end();
    });
  }
  sendStatus(IMEI) {
    return new Promise((resolve, reject) => {
      console.log('Enviando estado a: '.blue, IMEI);
      this.request(
        {
          'request': 'SEND_STATUS',
          'IMEI': IMEI
        }).then(resolve).catch(reject);
    });
  }
  sendStatusMonitor(IMEI) {
    return new Promise((resolve, reject) => {
      console.log('Enviando estado a: '.blue, IMEI);
      this.request(
        {
          'request': 'SEND_STATUS_MONITOR',
          'IMEI': IMEI
        }).then(resolve).catch(reject);
    });
  }
  sendStatusMonitorTeleop(IMEI,idTeleop) {
    return new Promise((resolve, reject) => {
      console.log('Enviando monitor status a: '.blue, IMEI);
      this.request(
        {
          'request': 'SEND_STATUS_MONITOR',
          'IMEI': IMEI,
          'idTeleop':idTeleop
        }).then(resolve).catch(reject);
    });
  }
  async requestClientToken() {
    const response = await this.request({ 'request': 'GET_FRONTEND_TOKEN' });
    response.host = VEHICLE_SERVER;
    response.https = VEHICLE_HTTP_PORT;
    response.mqtts = VEHICLE_MQTT_PORT;
    return response;
  }
  getVehicleInfo(IMEI) {
    return new Promise((resolve, reject) => {
      this.request({ 'request': 'GET_VEHICLE_INFO', 'imei': IMEI }).then(resolve).catch(reject);
    });
  }
  getVehicleInfoById(id) {
    return new Promise((resolve, reject) => {
      this.request({ 'request': 'GET_VEHICLE_INFO_BY_ID', 'id': id }).then(resolve).catch(reject);
    });
  }

  sendRestartRobot(imei){

    return new Promise(resolve => {
      this.mqttPublish(`ota/${imei}`, JSON.stringify({command: 'RB'}), { 'qos': 2 }).then(resolve);
    });

  }

  turnOffRobot(imei){
    return new Promise(resolve => {
      this.mqttPublish(`ota/${imei}`, JSON.stringify({command: 'SD'}), { 'qos': 2 }).then(resolve);
    });

  }

  changeEnvironment(imei){
    return new Promise(resolve => {
      this.mqttPublish(`instruction/${imei}`, JSON.stringify({command: 'SE'}), { 'qos': 2 }).then(resolve);
    });
  }

  updateContainerQuantity(sku,quantity)
  {
    return new Promise((resolve, reject) => {
      console.log('Actualizando sku quantity: '.blue, sku);
      this.request(
        {
          'request': 'UPDATE_QUANTITY',
          'sku': sku,
          'quantity':quantity
        }).then(resolve).catch(reject);
    });
  }
}


module.exports = new VehicleBridge(VEHICLE_SERVER, TOKEN);
