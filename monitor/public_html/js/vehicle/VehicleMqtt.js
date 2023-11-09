/* global mqtt */
function getRandomIntInclusive(min, max) {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);

  let randomNumber = randomBuffer[0] / (0xffffffff + 1);

  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(randomNumber * (max - min + 1)) + min;
}


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
    ;
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
    this.server = data.connection || {};
    this.monitor = data.monitor;
    this.teleop=data.teleop;
    this.volume=data.volume;

    console.log("VEHICLE UPDATE DATA: ", this);
  }
}

export class VehicleMqtt {
  constructor(updateCallback, topic) {
    this.topic = topic;
    this.updateCallback = updateCallback;
    this.vehicles = {};
    this.subscriptions = {};
    this.connect(topic);
  }

  async connect(topic) {
    await this.getToken();
    this.client = mqtt.connect(this.vehicleServer, {
      protocol: 'wss',
      username: `user-vending-${getRandomIntInclusive(0, 99999)}`,
      password: this.token
    });
    this.client.subscribe(topic || 'vehicles/all/update');
    this.client.on('message', this.onmessage.bind(this));
    this.client.on('close', this.onclose.bind(this));
    this.client.on('error', this.onerror.bind(this));
  }

  onerror(err) {
    console.error(err);
    this.getToken();
  }
  subscribe(topic, callback) {
    this.subscriptions[topic] = { 'callback': callback };
    this.client.subscribe(topic);
  }
  unsubscribe(topic) {
    delete this.subscriptions[topic];
    this.client.unsubscribe(topic);
  }
  unsubscribeAll() {
    const topics = Object.keys(this.subscriptions);
    for (const topic of topics) {
      delete this.subscriptions[topic];
      this.client.unsubscribe(topic);
    }
  }
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

  destroy() {
    if (this.client) {
      this.client.end();
      delete this.client;
    }
  }
  getToken() {
    return new Promise(resolve => {
      $.post('/getVehicleToken', {}, result => {

        console.log('MQTT server result',result);

        //TEst with dev3
        this.vehicleServer = `https://${result.host}:${result.https}`;
        this.MqttvehicleServer = `https://${result.host}:${result}`;
        this.token = result.token;
        if (this.client) {
          this.client.options.password = this.token;
        }
        resolve(result.token);
      });
    });
  }

  onmessage(topic, message) {
    const data = JSON.parse(message.toString());
    const subtopics = topic.split('/');
    const modifiedTopic = this.topic ? this.topic.split('/') : '';

    
    switch (subtopics[0]) {
      case modifiedTopic[0]:
        this.updateCallback(data, subtopics);
        break;

      case 'vehicles':
        const updated = [];

        for (const vehicledata of data) {

          //console.log('*Vehicle item heartbeat*',vehicledata);
          if (!this.vehicles[vehicledata.imei]) {
            this.vehicles[vehicledata.imei] = new Vehicle(vehicledata);
          } else {
            this.vehicles[vehicledata.imei].update(vehicledata);
          }
          updated.push(this.vehicles[vehicledata.imei]);

        }
        this.updateCallback(this, updated);
        break;

      case 'heartbeat':
        if (!this.vehicles[data.imei]) {
          this.vehicles[data.imei] = new Vehicle(data);
          this.updateCallback(this, [this.vehicles[vehicledata.imei]]);
          return;
        }
        this.vehicles[data.imei].update(data);
        this.updateCallback(this, [this.vehicles[vehicledata.imei]]);
        break;

    }

    const topics = Object.keys(this.subscriptions);
    for (const topicn of topics) {
      if (topic === topicn) {
        try {
          this.subscriptions[topic].callback(message.toString());
        } catch (e) {
          console.warn('Error on callback', topic, e);
        }
      }
    }

  }
  publish() {
    if (this.client) {
      this.client.publish(...arguments);
    } else {
      console.log('Mqtt client not ready', ...arguments)
    }

  }

  onclose() {
    console.log('Connection closed');
  }
}

//window.VehicleMqtt = VehicleMqtt;
