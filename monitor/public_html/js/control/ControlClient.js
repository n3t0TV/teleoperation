class ControlClient
{
  constructor()
  {
    this.socketJoystick=false;
    this.socketSensors = false;
    this.socketJoystickConnected = false;
    this.socketSensorsConnected = false;
    this.currentSensor=false;
    //this.teleopHost='gcloud.teleop.tortops.com';
    this.teleopHost=window.location.hostname;
  }

  setControlContainer(_controlContainer)
  {
    this.controlContainer=_controlContainer;
  }


  initSensorSocket(urlConnectSensors)
  {
    this.socketSensors = io.connect(urlConnectSensors, {
        reconnect: true,
        reconnectionDelay: 500,
        withCredentials: false,
        secure: true
    });

    this.socketSensors.on('connect',()=>{
        this.socketSensorsConnected = true;

        console.log('%c Sensor socket connected!', 'background: #ffff; color: #00ff00');
    });

    this.socketSensors.on('disconnect', ()=> {
        this.socketSensorsConnected = false;//Server monitors this disconnection and applies emergency brake
        console.log('%c Sensor socket disconnected!', 'background: #ffff; color: #ff0000');


    });

    this.socketSensors.on('reconnect',  ()=> {
        this.socketSensorsConnected = true;
        console.log('%c Sensor socket reconnected!', 'background: #ffff; color: #00ff00');

    });
  }

  initControlSocket(urlConnectJoystick)
  {
    this.socketJoystick = io.connect(urlConnectJoystick, {
        reconnect: true,
        reconnectionDelay: 500,
        withCredentials: false,
        secure: true
    });

    this.socketJoystick.on('connect', () => {
        this.socketJoystickConnected = true;

        console.log('%c Joystick socket connected!', 'background: #ffff; color: #00ff00');
    });

    this.socketJoystick.on('disconnect',  () => {
        this.socketJoystickConnected = false;//Server monitors this disconnection and applies emergency brake
        console.log('%c Joystick socket disconnected!', 'background: #ffff; color: #ff0000');


    });

    this.socketJoystick.on('reconnect', () => {
        this.socketJoystickConnected = true;
        console.log('%c Joystick socket reconnected!', 'background: #ffff; color: #00ff00');

    });
  }


  initClientConnection(idteleopsession,idVehiculo,imei)
  {
    console.log('Retrieving ports');
    let request =  this.getPorts(idteleopsession,idVehiculo,imei);

    request.then((result) => {
      console.log(result);

      //let urlConnectJoystick = 'https://' + window.location.hostname + ':' + result.PUERTO_JOYSTICK_UI + '/' + idVehiculo;
      //let urlConnectJoystick = 'https://'+this.teleopHost+':' + result.PUERTO_JOYSTICK_UI + '/' + idVehiculo;

      let urlConnectJoystick = 'https://' + this.teleopHost + ':' + result.PUERTO_JOYSTICK_UI + '/' + idVehiculo;
      let urlConnectSensors = 'https://' + this.teleopHost + ':' + result.PUERTO_SENSOR_UI + '/' + idVehiculo;


      this.controlContainer.initDefaultValues();
      console.log(urlConnectJoystick);
      this.initControlSocket(urlConnectJoystick);
      this.initSensorSocket(urlConnectSensors);

      this.setRate(67);
      this.startSocketInputMessageEvent();

    }, (error) => {
      console.error(error);
    });



  }

  startSocketInputMessageEvent()
  {
    this.socketSensors.on('sensors', (dict) => {
      //console.log("***Sensor dict***");
      //console.log(dict);
      this.currentSensor=dict;


    });
  
  }
  endClientConnection()
  {
    //io.close();
    //this.socketJoystick.disconnect();
    this.stop();
    this.socketJoystick=false;
  }

  getPorts(idteleopsession, idVehiculo,imei) {

    let host = window.location.host;

    return new Promise((resolve, reject) => {
      $.ajax({
        type: "GET",
        url: '//' + host + "/monitorteleop",
        data: {
          idteleopsession:idteleopsession,
          uid: idVehiculo,
          imei: imei

        },
        success: resolve,
        error: reject
      });
    });
  }


  sendPrimary(socketClient)
  {
    //console.log('Send primary interval!')
      if (!this.controlContainer) return false;

      var controlContainer = this.controlContainer;

      const timestamp = + new Date();

      const primary = {
          s: controlContainer.forwardSpeed,
          a: controlContainer.turnSpeed,
          b: controlContainer.brakeSignal,
          t: timestamp
      };



      if(this.socketJoystick)
      {
        //console.log(primary);
        this.socketJoystick.volatile.emit('serverJoystick', JSON.stringify(primary), () => {});
      }


  }

  // sendExtended(socketClient) {
  //     if (!this.controlContainer) return false;

  //     var controlContainer = this.controlContainer;

  //     const timestamp = + new Date();

  //     const extended = {
  //         l: controlContainer.currentLightLevel,
  //         tl: 0,
  //         r: controlContainer.currentPowerSignal,
  //         c: controlContainer.movCam,
  //         x: controlContainer.exposure,
  //         ac: "0",
  //         AP: false,
  //         t: timestamp
  //     };


  //     if(this.socketJoystick)
  //     {
  //       //console.log(extended);
  //       this.socketJoystick.emit('serverJoystick', JSON.stringify(extended), () => {});
  //       //console.log(JSON.stringify(extended));
  //     }

  // }

  stop() {
      clearInterval(this.interval);
      clearInterval(this.interval2);
  }

  setRate(rate) {
      clearInterval(this.interval);
      clearInterval(this.interval2);
      this.interval = setInterval(this.sendPrimary.bind(this), rate, this);
      // TODO: verify if movCam came be send by mqtt
      //this.interval2 = setInterval(this.sendExtended.bind(this), rate * 4, this);
  }

}

let controlClient= new ControlClient();
export {controlClient};
