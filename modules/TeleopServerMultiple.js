const TeleopMultiple = require('./TeleopMultiple.js');
const dgram = require('dgram');
const express = require('express');
const os = require('os');
const colors = require('colors');
const config = require('../config/config.js');
/*const { insertNetworkData } = require('./influx/querys/networkDataInflux');*/
const LocalStorage = require('node-localstorage').LocalStorage;
const localStorage = new LocalStorage('./localStorage');
const mysqlJson = require('./Database.js');
const performance = require('./performance.js');
const vehicleBridge = require('./VehicleBridge.js');
const DEBUG_WEBSOCKET = false;
class TeleopServerMultiple {

  constructor() {
    this.mysqlJson = mysqlJson;
    this.sessionByIMEI = {};
    this.sessionByImageIPPort = {};
    this.sessionBySensorIPPort = {};
    this.sessionByRoboArmIPPort = {};
    this.sessionByVehicle = {};
    //this.sessions = {};
    let puerto_sesion = 8;
    /*if (os.hostname() === 'mainserver') {
      puerto_sesion = 8;
    }*/
    console.log(os.hostname(), puerto_sesion);
    
    this.mysqlJson.query("CALL GET_PORTS();", (err, response) => {
      if (err) {
        console.log(err);
        return;
      }

      // Puertos UDP
      this.sessionPort = response[0][puerto_sesion].UID_PUERTO_SESION;
      this.controlPort = response[0][puerto_sesion].PUERTO_CONTROL;
      this.sensorPort = response[0][puerto_sesion].PUERTO_SENSOR;
      this.videoPort = response[0][puerto_sesion].PUERTO_VIDEO;
      this.RoboArmPort = response[0][puerto_sesion].PUERTO_LATENCY;
      
      // Puertos UI
      this.UIVideoPort = response[0][puerto_sesion].PUERTO_IMAGENES_UI;
      this.UIJoystickPort = response[0][puerto_sesion].PUERTO_JOYSTICK_UI;
      this.UIRoboArmPort = response[0][puerto_sesion].PUERTO_LATENCY_UI;
      this.UISensorPort = response[0][puerto_sesion].PUERTO_SENSOR_UI;
      this.initialize();
    });
  }

  initialize() {
    // Empezar a escuchar después de teleoperar

    // Sockets UDP
    // this.imageServer = dgram.createSocket('udp4');
    // this.imageServer.on('message', this.onImageMessage.bind(this));
    this.sensorServer = dgram.createSocket('udp4');
    this.sensorServer.on('message', this.onSensorMessage.bind(this));
    // this.roboArmServer = dgram.createSocket('udp4');
    // this.roboArmServer.on('message', this.onRoboArmMessage.bind(this));
    this.controlServer = dgram.createSocket('udp4');
    this.controlServer.on('message', this.onControlMessage.bind(this));
    this.controlServer.bind(this.controlPort); //El de control se puede asignar desde el principio

    // Socket.IO websocket
    this.app = express();
    /*  const cors = require('cors');
      this.app.use(cors({
          credentials: true, // This is important.
          origin: (origin, callback) => {
              return callback(null, true);
          }
      }));*/
    const options = {
      cors: { origin: '*' },
      allowEIO3: true
    };
    this.httpServerJoy = require('./HttpsServer.js')();
    this.ioJoystick = require('socket.io')(this.httpServerJoy, options);
    this.httpServerImg = require('./HttpsServer.js')();
    this.ioImages = require('socket.io')(this.httpServerImg, options);
    this.httpServerLat = require('./HttpsServer.js')();
    this.ioRoboArm = require('socket.io')(this.httpServerLat, options);
    this.httpServerSen = require('./HttpsServer.js')();
    this.ioSensors = require('socket.io')(this.httpServerSen, options);

    //Recuperar sesiones de teleroperación
    //this.mysqlJson.query("CALL TELEOPREQUEST_LIST();", this.teleopRecovery.bind(this));
    this.mysqlJson.query("CALL GET_VEHICLES_WITH_ACTIVE_TELEOPERATION();", this.teleopRecovery.bind(this));
  }

  async teleopRecovery(err, response) {
    if (err) {
      console.log('Error al recuperar sesiones'.red, err);
      return;
    }
    for (const row of response[0]) {
      // if (row.ID_ESTATUS_SOLICITUD !== 15) {
      //   console.log(row.UID_RUTA, 'skipped', row.ID_ESTATUS_SOLICITUD);
      //   continue;
      // }

      const vehicleInfo = await vehicleBridge.getVehicleInfo(row.UID_PHYSICAL);
      if (!vehicleInfo || !vehicleInfo.connection) {
        continue;
      }
      const serverDomain = vehicleInfo.connection.domain;
      if (serverDomain === config.domain) { //Solo recupera los que le corresponden
        console.log(row.UID_VEHICULO, 'will be created');
        //this.createSession(row.UID_RUTA, row.UID_VEHICULO, row.UID_PHYSICAL);
        this.createSessionForIMEI(row.UID_PHYSICAL, row.UID_VEHICULO, row.UID_PHYSICAL);
      } else {
        console.log(row.UID_PHYSICAL, ' ', serverDomain, ' does not match this server ', config.domain);
      }
    }

    // Empezar a escuchar después de recuperar
    // Socket.IO websocket
    this.httpServerJoy.listen(this.UIJoystickPort);
    this.httpServerImg.listen(this.UIVideoPort);
    this.httpServerLat.listen(this.UIRoboArmPort);
    this.httpServerSen.listen(this.UISensorPort);
    this.bindUDP();
    console.log('Sessions ready after: '.green, performance.toc() + 'ms');
  }

  bindUDP() {
    //this.imageServer.bind(this.videoPort);
    this.sensorServer.bind(this.sensorPort);
    //this.roboArmServer.bind(this.RoboArmPort);
  }

  createSession(sessionId, vehicleId, vehicleIMEI) {
    console.log('Creating session', sessionId, vehicleId, vehicleIMEI);
    if (this.sessionByIMEI[vehicleIMEI]) {
      console.log("Sesión ya creada " + sessionId);
      return this.sessionByIMEI[vehicleIMEI];
    }
    if (vehicleIMEI) {
      return this.createSessionForIMEI(sessionId, vehicleId, vehicleIMEI); // fast way
    }
  }

  createSessionForIMEI(sessionId, vehicleId, IMEI) {
    let IPport;
    if (this.sessionByIMEI[IMEI]) {
      try {
        this.sessionByIMEI[IMEI].finish();
      } catch (finishe) {
        console.log(finishe);
      }
      delete this.sessionByIMEI[IMEI];
    }

    console.log('Crear sesión ' + sessionId + ' ' + vehicleId + ' ' + IMEI);
    const session = new TeleopMultiple(sessionId, vehicleId, IMEI, this.ioImages, this.ioJoystick, this.ioRoboArm, this.ioSensors, this.controlServer);
    //this.sessions[sessionId] = session;
    this.sessionByIMEI[IMEI] = session;
    //this.sessionByVehicle[vehicleId] = session;
    console.log('Sesión creada para ' + vehicleId + ' ' + IMEI);
    if (localStorage['controlport-' + IMEI]) {
      const recover = JSON.parse(localStorage['controlport-' + IMEI]);
      session.setControlPorts(recover.address, recover.port);
      console.log('IP PUERTO de control recuperados para ' + IMEI, recover.address + ':' + recover.port);
    }


    if (localStorage['sensorport-' + IMEI]) {
      IPport = localStorage['sensorport-' + IMEI];
      session.sensorIPport = IPport;
      this.sessionBySensorIPPort[IPport] = session;
      console.log('IP PUERTO de sensores recuperados para ' + IMEI, IPport);
    }

    if (localStorage['roboarmport-' + IMEI]) {
      IPport = localStorage['roboarmport-' + IMEI];
      session.latencyIPport = IPport;
      this.sessionByRoboArmIPPort[IPport] = session;
      console.log('IP PUERTO de latencia recuperados para ' + IMEI, IPport);
    }

    if (localStorage['imageport-' + IMEI]) {
      let array;
      try {
        array = JSON.parse(localStorage['imageport-' + IMEI]);
      } catch (e) {
        array = [];
      }

      for (IPport of array) {
        session.imageIPport = IPport;
        this.sessionByImageIPPort[IPport] = session;
        console.log('IP PUERTO de imagen recuperados para ' + IMEI, IPport);
      }
    }
    return session;
  }

  destroySession(vehicleId) {
    setTimeout(() => {
      try {
        const session = this.sessionByVehicle[vehicleId];
        session.finish();
        const sessionId = this.sessionByVehicle[vehicleId].sessionId;
        const IMEI = session.IMEI;
        const imageIPport = session.imageIPport;
        const sensorIPport = session.sensorIPport;
        const latencyIPport = session.latencyIPport;
        delete this.sessionByVehicle[vehicleId];
        //delete this.sessions[sessionId];
        delete this.sessionByIMEI[IMEI];
        delete this.sessionByImageIPPort[imageIPport];
        delete this.sessionBySensorIPPort[sensorIPport];
        delete this.sessionByRoboArmIPPort[latencyIPport];
        delete localStorage['controlport-' + IMEI];
        delete localStorage['sensorport-' + IMEI];
        delete localStorage['imageport-' + IMEI];
        delete localStorage['roboarmport-' + IMEI];
      } catch (e) {

      }
    }, 1000);
  }

  onRoboArmMessage(msg, rinfo) {
    const msgContent = JSON.parse(msg.toString().slice(0, -1));
    console.log("========== onRoboArmMessage ==========");
    console.log("msgContent: ", msgContent);
    console.log("rinfo: ", rinfo);
    console.log("==========++++++++++++++++++==========");
  }

  onImageMessage(msg, rinfo) {
    const IPport = rinfo.address.toString() + ':' + rinfo.port.toString();
    // insertNetworkData(msg.byteLength, 'UDP-SCOOTER-IMAGE', rinfo.address.toString()).catch(error => {
    //     console.log(error, 'UDP-SCOOTER-IMAGE');
    // });
    const message = msg.toString();
    if (DEBUG_WEBSOCKET)
      console.log('>HDR'.brightGreen, message.substr(0, 4), message.substr(4, 15), rinfo.address + ':' + rinfo.port); //Debug
    if (message.substr(0, 4) === 'imei') {
      const headerImei = message.substr(4, 15);
      const buffer = msg.slice(19);
      const session = this.sessionByIMEI[headerImei];
      if (!session) {
        console.log('×IMG '.cyan, ('Mensaje de imagen recibido de ' + IPport + ' pero no tiene sesión activa').red);
        return;
      }
      session.onImageMessage(buffer, rinfo);
      return;
    }
    if (msg.length === 15) //Mensaje de IMEI
    {
      const IMEI = msg;
      console.log(`LLEGUE CON MI IMEI: ${IMEI}`);
      const session = this.sessionByIMEI[IMEI];
      if (!session) {
        console.log('×IMG '.cyan, ('Mensaje de imagen recibido para ' + IMEI + ' pero no tiene sesión activa').red);
        return;
      }
      if (DEBUG_WEBSOCKET)
        console.log('>IMG '.brightCyan, rinfo.address + ':' + rinfo.port, ' : ', IMEI.toString().cyan); //Debug
      session.imageIPport = IPport;
      this.sessionByImageIPPort[IPport] = session;
      try {
        let array;
        const stored = localStorage.getItem('imageport-' + IMEI);
        if (stored) {
          try {
            array = JSON.parse(stored);
          } catch (e) {
            array = [];
          }
        } else {
          array = [];
        }
        if (array.indexOf(IPport) < 0) { //Si es nuevo
          array.push(IPport);
          localStorage.setItem('imageport-' + IMEI, JSON.stringify(array));
        }
      } catch (e) {
        console.log(e.toString().red);
      }
      return;
    }

    const session = this.sessionByImageIPPort[IPport];
    // console.log(this.sessionByImageIPPort);
    if (!session) {
      console.log('×IMG '.cyan, ('Mensaje de imagen recibido de ' + IPport + ' pero no tiene sesión activa').red);
      return;
    }
    session.onImageMessage(msg, rinfo);
  }

  onSensorMessage(msg, rinfo) {
    const IPport = rinfo.address.toString() + ':' + rinfo.port.toString();
    // insertNetworkData(msg.byteLength, 'UDP-SCOOTER-SENSOR', rinfo.address.toString()).catch(error => {
    //     console.log(error, 'UDP-SCOOTER-SENSOR');
    // });
    if (msg.length === 15) //Mensaje de IMEI
    {
      const IMEI = msg;
      const session = this.sessionByIMEI[IMEI];
      if (!session) {
        console.log('×SNS '.yellow, ('Mensaje de imagen recibido para ' + IMEI + ' pero no tiene sesión activa').red);
        return;
      }
      if (DEBUG_WEBSOCKET)
      console.log('>SNS '.brightYellow, rinfo.address + ':' + rinfo.port, ' : ', IMEI.toString().yellow); //Debug
      session.sensorIPport = IPport;
      this.sessionBySensorIPPort[IPport] = session;
      try {
        localStorage.setItem('sensorport-' + IMEI, IPport);
      } catch (e) {
        console.log(e.toString().red);
      }
      return;
    }
    const session = this.sessionBySensorIPPort[IPport];
    if (!session) {
      return;
    }
    session.onSensorMessage(msg, rinfo);
  }
  onControlMessage(msg, rinfo) {
    // insertNetworkData(msg.byteLength, 'UDP-SCOOTER-CONTROL', rinfo.address.toString()).catch(error => {
    //     console.log(error, 'UDP-SCOOTER-CONTROL');
    // });
    const IMEI = msg.toString();
    //console.log('IMEI: ' + msg);

    const session = this.sessionByIMEI[IMEI];
    if (!session) {
      console.log('×CTRL '.magenta, ('Mensaje de control recibido para ' + IMEI + ' pero no tiene sesión activa').red);
      console.log('Se envia señal de finalización...');
      const buffer = Buffer.from('Die!');
      // insertNetworkData(buffer.length, 'UDP-SERVER-CONTROL', rinfo.address.toString()).catch(error => {
      //     console.log(error, 'UDP-SERVER-CONTROL');
      // });
      this.controlServer.send(buffer, 0, buffer.length, rinfo.port, rinfo.address);
      return;
    }
    //  if (DEBUG_WEBSOCKET)
    console.log('>CTRL '.brightMagenta, rinfo.address + ':' + rinfo.port, ' : ', IMEI.magenta); //Debug
    session.setControlPorts(rinfo.address, rinfo.port);
    try {
      localStorage.setItem('controlport-' + IMEI, JSON.stringify({ 'address': rinfo.address, 'port': rinfo.port }));
    } catch (e) {
      console.log(e.toString().red);
    }
  }

}


module.exports = new TeleopServerMultiple();
