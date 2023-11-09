const path = require('path');
const { Readable } = require('stream');

//const { insertSensor } = require('./influx/querys/sensorInflux');

const tmp_path = path.join(__dirname, 'tmp');
const fs = require('fs');
const FormData = require('form-data');
const got = require('got');
const dgram = require('dgram');
const colors = require('colors');
const { request } = require('http');
const { Console } = require('console');
const DEBUG_WEBSOCKET = false;
const DEBUG_LATENCY = false;

class TeleopSession {
    constructor(_sessionId, _vehicleId, _IMEI, _ioImages, _ioJoystick, _ioRoboArm, _ioSensors, _controlServer) {
        //Sockets and port info
        this.sessionId = _sessionId;
        this.vehicleId = _vehicleId;
        this.IMEI = _IMEI;
        this.hostServer = '0.0.0.0';
        this.startedTime = (new Date()).getTime();

        this.lastFrame = null;
        this.lastFrontFrame = null;
        this.lastBackFrame = null;

        this.fStream = null;
        this.tStream = null;

        this.controlJsonMsg = {};
        //Json from teleops ui
        /*this.controlJsonMsg.forwardSpeed=0;
         this.controlJsonMsg.turnAngle=0;
         this.controlJsonMsg.brainFlag=0;
         this.controlJsonMsg.blinker=0;
         this.controlJsonMsg.lightSignal=0;
         this.controlJsonMsg.reset=0;
         this.controlJsonMsg.offset=0;
         this.controlJsonMsg.brake=0;
         this.controlJsonMsg.videoMode=0;*/

        this.sensorJsonMsg = {}; //json from scooter
        //Sensor gps and network data

        this.bandwidth = 0;
        this.latency = 0;

        this.imageCount = 0;
        this.fps = 0;
        this.receivedFrames = 0;
        this.throughput = 0;
        this.mssSum = 0
        this.gpsFlag = -1;
        this.backendStopInterval = 1000;
        //Latency data
        this.teleopsLatency = 0;
        this.scooterLatency = 0;
        this.intervalID = null;

        this.controlConnected = false;
        this.emergencyStop = 0;
        //DEBUG
        this.count = 0;
        this.numControlMessages = 0;
        this.idSesionTeleops = 0;
        this.controlServer = _controlServer;

        try { //Clearing namespaces
            delete this.ioImages.socket.nsps['/' + this.vehicleId];
            delete this.ioJoystick.socket.nsps['/' + this.vehicleId];
            delete this.ioRoboArm.socket.nsps['/' + this.vehicleId];
            delete this.ioSensors.socket.nsps['/' + this.vehicleId];
        } catch (e) {
            //           console.log(e);
        }

        this.ioImages = _ioImages.of('/' + this.vehicleId);
        this.ioJoystick = _ioJoystick.of('/' + this.vehicleId);
        this.ioRoboArm = _ioRoboArm.of('/' + this.vehicleId);
        this.ioSensors = _ioSensors.of('/' + this.vehicleId);
        this.JoystickSocket = null;
        this.RoboArmSocket = null;
        this.ioJoystick.on('connection', (socketConnection) => {

            console.log('Navegador conectado para joystick: '.magenta, socketConnection.handshake.address);
            if (this.JoystickSocket) {
                console.log('Cerrando sesión anterior de navegador');
                this.JoystickSocket.removeAllListeners('serverJoystick');
                this.JoystickSocket = socketConnection;
            } else {
                this.JoystickSocket = socketConnection;
            }

            socketConnection.on('serverJoystick', (msg, callback) => {
                this.onJoystick(msg).then(() => {
                    callback('ok');
                }).catch(err => {
                    //   console.error(err);
                });
            });

            socketConnection.on('serverarm', (msg, callback) => {
                console.log('serverarm msg:', msg);
                this.onJoystick(msg).then(() => {
                    callback('ok');
                }).catch(err => {
                    //   console.error(err);
                });
            });

            socketConnection.on('disconnect', () => {

                this.emergencyStop = 1;
                console.log("Web socket disconnected, enabling emergency stop");
            });

        });

        this.ioRoboArm.on('connection', (socketConnection) => {

            console.log('Navegador conectado para RoboArm: '.green, socketConnection.handshake.address);
            if (this.RoboArmSocket) {
                console.log('Cerrando sesión anterior de navegador');
                clearInterval(this.intervalID);
                this.RoboArmSocket.removeAllListeners('latency');
                this.RoboArmSocket = socketConnection;
            } else {
                this.RoboArmSocket = socketConnection;
                clearInterval(this.intervalID);
            }

            socketConnection.on('serverarm', (msg) => {
                console.log("============ SERVER-ARM ============");
                console.log("MSG:" ,msg);
                this.controlServer.send(msg, 0, msg.length, this.clientPort, this.clientAddress, err => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            socketConnection.on('TakeSnapshot', async (url) => {
                if (this.lastFrontFrame) {
                    try {
                        const form = new FormData();
                        form.append('snapshot', Buffer.from(this.lastFrontFrame.substr(4, this.lastFrontFrame.length), 'base64'), { filename: 'test.jpg' });
                        form.append('sessionId', this.sessionId);

                        const response = await got(url, { method: 'POST', body: form });
                        if (response.statusCode === 200) {
                            this.RoboArmSocket.emit('CellphoneResult', 'Message sent');
                        } else {
                            console.log(response.body);
                            ncySocket.emit('CellphoneResult', 'Error sending photo');
                        }
                    } catch (error) {
                        console.log('error: ', error);
                        this.RoboArmSocket.emit('CellphoneResult', 'Error sending photo');
                    }
                }
            });

            socketConnection.on('SendSnapshot', async (url) => {
                if (this.lastFrontFrame) {
                    try {
                        const form = new FormData();
                        const imageBuffer = this.lastFrontFrame.substr(4);
                        const buffer = Buffer.from(imageBuffer, 'base64');
                        form.append('snapshot', buffer, { filename: 'test.jpg' });
                        form.append('Token', 'Ph1crLVocr7hOhAp-aze5i=+cHasT0kl');

                        const response = await got(url, { method: 'POST', body: form });
                        if (response.statusCode === 200) {
                            this.RoboArmSocket.emit('CellphoneResult', 'Photo uploaded');
                        } else {
                            console.log(response);
                            console.log(response.body);
                            this.RoboArmSocket.emit('CellphoneResult', 'Error uploading photo');
                        }
                    } catch (error) {
                        console.log('error: ', error);
                        this.RoboArmSocket.emit('CellphoneResult', 'Error uploading photo');
                    }
                } else {
                    console.log('NO LAST FRAME');
                }
            });

            socketConnection.on('OpenStorage', async (url) => {
                if (this.lastFrontFrame) {
                    try {
                        const response = await got(url, { method: 'POST', json: { sessionId: this.sessionId, imei: this.IMEI } });
                        if (response.statusCode === 200) {
                            this.RoboArmSocket.emit('StorageResult', 'Unlocked storage(s)');
                        } else {
                            console.log(response.body);
                            this.RoboArmSocket.emit('StorageResult', 'Error unlocking storage(s)');
                        }
                    } catch (error) {
                        console.log('error: ', error);
                        this.RoboArmSocket.emit('StorageResult', 'Error unlocking storage(s)');
                    }
                }
            });

        });
        console.log('iniciando interval');
        //this.interval = setInterval(this.serverControlTimer.bind(this), 100);
        this.fpscounter = setInterval(this.countFps.bind(this), 1000);

        this.imageuploader = setInterval(this.imageUpload.bind(this), 10000);

        console.log('Created: ', this.sessionId);
    }

    async onJoystick(msg) {
        return new Promise((resolve, reject) => {
            if (DEBUG_WEBSOCKET)
                console.log(msg);
            if (!this.clientPort || !this.clientAddress) return reject('No connection data');
            this.controlServer.send(msg, 0, msg.length, this.clientPort, this.clientAddress, err => {
                if (err) return reject(err);
                resolve();
            });
        });
    }

    imageUpload() {
        /* 
         if (this.lastFrontFrame) {
         const imageFrontBuffer = Buffer.from(this.lastFrontFrame.substr(4, this.lastFrontFrame.length), 'base64');
         upload_image(`${this.IMEI}_${this.sessionId}_${(new Date()).getTime()}_frontal`, imageFrontBuffer);
         }
         if (this.lastBackFrame) {
         const imageBackBuffer = Buffer.from(this.lastBackFrame.substr(4, this.lastBackFrame.length), 'base64');
         upload_image(`${this.IMEI}_${this.sessionId}_${(new Date()).getTime()}_trasera`, imageBackBuffer);
         }
         */
    }

    countFps() {
        this.fps = this.receivedFrames;
        //Se calcula el Throughput
        if (this.fps !== 0)
            this.throughput = Math.floor(this.mssSum / this.fps);
        else
            this.throughput = this.mssSum;
        this.mssSum = 0;
        this.receivedFrames = 0;
    }

    finish() {
        if (this.fStream) {
            this.fStream.end();
            upload(this.sessionId, 0, `${this.IMEI}_${this.sessionId}_${this.startedTime}_frontal`, this.converter);
        }
        if (this.tStream) {
            this.tStream.end();
            upload(this.sessionId, 1, `${this.IMEI}_${this.sessionId}_${this.startedTime}_trasera`, this.tconverter);
        }
        console.log(`Destroying ${this.IMEI} ${this.sessionId}`);
        clearInterval(this.interval);
        clearInterval(this.fpscounter);
        clearInterval(this.imageuploader);
        try {
            delete this.ioImages.removeAllListeners();
            delete this.ioJoystick.removeAllListeners();
            delete this.ioImages.socket.nsps['/' + this.vehicleId];
            delete this.ioJoystick.socket.nsps['/' + this.vehicleId];
        } catch (e) {
            //           console.log(e);
        }
    }
    restartSession(_idSesionTeleops) {
        this.idSesionTeleops = _idSesionTeleops;
        this.lastFrame = null;
        this.imageCount = 0;
        this.desiredSpeed = 0;
        this.sensedSpeed = 0;
        this.desiredAngle = 0;
        this.sensedAngle = 0;
        this.networkPower = 0;
        this.bandwidth = 0;
        this.latency = 0;
        this.gpsLat = 0;
        this.gpsLon = 0;
        this.gpsAlt = 0;
        this.batteryLevel = 0;
        this.magnOrientation = 0;
    }

    onImageMessage(message, rinfo) {
        this.lastFrame = message.toString('base64');
        if (this.lastFrame) {
            this.ioImages.volatile.emit('image', {
                image: this.lastFrame
            });
        }
        if (DEBUG_WEBSOCKET)
            console.log('>IMG '.cyan, rinfo.address + ':' + rinfo.port, (' ' + this.vehicleId + ':' + this.IMEI + ' '), ' length: ' + message.length, ' : ', this.lastFrame.toString().substr(0, 4));//Debug

        this.mssSum = this.mssSum + message.length;
        this.receivedFrames++;
        if (this.lastFrame.substr(0, 4) === "MDBm") {
            this.lastFrontFrame = this.lastFrame;
        } else if (this.lastFrame.substr(0, 4) === "MDBi") {
            this.lastBackFrame = this.lastFrame;
        } else //Frontal 1st subdivision
        {
            //console.log(this.lastFrame.substr(0, 4));
            if (this.lastFrame.substr(0, 4) === "MDFm")//1st cuad front image
                console.log("First quad front image");
            if (this.lastFrame.substr(0, 4) === "MDJm")//1st cuad front image
                console.log("Second quad front image");
            if (this.lastFrame.substr(0, 4) === "MDNm")//1st cuad front image
                console.log("Third quad front image");
            if (this.lastFrame.substr(0, 4) === "MDRm")//1st cuad front image
                console.log("Fourt quad front image");
            else {
                if (DEBUG_WEBSOCKET)
                    console.log("HEADER RECEIVED: " + this.lastFrame.substr(0, 4));
            }
            //Front image part 1
            this.lastFrontFrame = this.lastFrame;
        }

    }

    onSensorMessage(message, rinfo) {
        if (DEBUG_WEBSOCKET)
            console.log('>SNS '.yellow, rinfo.address + ':' + rinfo.port, (' ' + this.vehicleId + ':' + this.IMEI + ' '), ' length: ' + message.length); //Debug

        try {
            //console.log(message.toString());
            this.sensorJsonMsg = JSON.parse(message.toString());

        } catch (e) {
            this.sensorJsonMsg = {};
            console.log('Unable to parse sensor message' + e);
        }

        //    console.log(this.vehicleId, this.sessionId, this.sensorJsonMsg, this.scooterLatency, this.teleopsLatency, this.fps, (this.clientAddress||'noad').toString(), this.IMEI);
        /*insertSensor(this.sessionId, this.sensorJsonMsg.desiredSpeed, this.sensorJsonMsg.sensedSpeed, this.sensorJsonMsg.desiredAngle, this.sensorJsonMsg.sensedAngle, this.sensorJsonMsg.networkPower, this.scooterLatency, this.teleopsLatency, this.fps, this.sensorJsonMsg.gpsLat, this.sensorJsonMsg.gpsLon, this.sensorJsonMsg.gpsAlt, this.sensorJsonMsg.batteryLevel, (this.clientAddress || 'noclientad').toString(), this.IMEI.substr(-6), this.sensorJsonMsg.gpsFlag, this.vehicleId ).catch(error => {
         console.log(error, 'SENSOR');
         });*/

        clearTimeout(this.sensorTimeout);
        this.sensorTimeout = setTimeout(this.onsensorTimeout.bind(this), 3000);
        const dateMilis = (new Date()).getTime()
        const messageMQTT = JSON.stringify({
            timestamp: dateMilis,
            latency: this.scooterLatency,
            imei: this.IMEI,
            type: 'scooter'
        });
        //client.publish(`latency/${this.IMEI}`, messageMQTT);

        //Add network data
        this.sensorJsonMsg.latency = this.latency;
        this.sensorJsonMsg.teleopsLatency = this.teleopsLatency;
        this.sensorJsonMsg.bandwidth = this.bandwidth;
        this.sensorJsonMsg.scooterLatency = this.scooterLatency;
        this.sensorJsonMsg.fps = this.fps;

        if (DEBUG_WEBSOCKET)
            console.log(this.sensorJsonMsg);

        this.ioSensors.volatile.emit('sensors', this.sensorJsonMsg);
        /*this.ioSensors.volatile.emit('sensors',
         {
         network: this.sensorJsonMsg.networkPower, gpsLat: this.sensorJsonMsg.gpsLat, gpsLon: this.sensorJsonMsg.gpsLon,
         batteryLevel: this.sensorJsonMsg.batteryLevel, sensedSpeed: this.sensorJsonMsg.sensedSpeed, sensedAngle: this.sensorJsonMsg.sensedAngle, fps: this.fps,
         bandwidth: this.bandwidth, latency: this.latency, magnOrientation: this.sensorJsonMsg.magnOrientation, teleopsLatency: this.teleopsLatency, scooterLatency: this.scooterLatency
         });*/
    }

    onsensorTimeout() {
        this.ioImages.emit('vehicleDisconnected', {});
    }

    setControlPorts(address, port) {
        this.clientAddress = address;
        this.clientPort = port;
    }



}
module.exports = TeleopSession;
