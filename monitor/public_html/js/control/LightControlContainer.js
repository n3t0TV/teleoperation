

class LightControlContainer {


  constructor() {

      this.turnSpeed = 0;
      this.forwardSpeed = 0;
      this.brakeSignal = 0;
      this.steerLever=0;
      this.currentPowerSignal=0;
      this.speedFactor=10;
      this.angleFactor=14.0;
      this.maxSpeed=100;
      this.minSpeed=-50;
      this.maxAngle=14;
      this.speedCallback=false;
      this.switchCameraCallback=false;
      this.spinCameraCallback=false;
      this.fullVideoCallback=false;
      this.recordCallback=false;
      this.fullVideo=true;
      this.enableControl=false;
      this.gamepadConnected=false;
      this.startRecord=false;
      //Control variables to send
      this.initDefaultValues();

  }

  initDefaultValues()
  {
    this.exposure=-1;
    this.currentLightLevel=0;
    this.movCam=-167;

  }

  updateEnableControl(_enable)
  {
    console.log('Enable move control!',_enable);
    this.enableControl=_enable;
    if(!_enable)
    {
      this.forwardSpeed=0;
      this.turnSpeed=0;
    }
  }


    createController() {

      const TeleopControl = new Controller();
      TeleopControl.addAxis(new Axis(-1, 1), 'steer');
      TeleopControl.addAxis(new Axis(-1, 1), 'RX');
      TeleopControl.addAxis(new Axis(-1, 1), 'RY');
      TeleopControl.addAxis(new Axis(0, 1), 'accel');
      TeleopControl.addAxis(new Axis(0, 1), 'record');


      TeleopControl.addButton(new Button(), 'shiftUp');
      TeleopControl.addButton(new Button(), 'shiftDown');

      TeleopControl.addButton(new Button(), 'crossUp');
      TeleopControl.addButton(new Button(), 'crossDown');
      TeleopControl.addButton(new Button(), 'crossLeft');
      TeleopControl.addButton(new Button(), 'crossRight');

      TeleopControl.addButton(new Button(), 'greenA');
      TeleopControl.addButton(new Button(), 'yellowY');
      TeleopControl.addButton(new Button(), 'blueX');
      TeleopControl.addButton(new Button(), 'redB');


      TeleopControl.addButton(new Button(), 'select');
      TeleopControl.addButton(new Button(), 'start');



      TeleopControl.on('button-greenA-down', this.greenA.bind(this));
      TeleopControl.on('button-yellowY-down', this.yellowY.bind(this));
      TeleopControl.on('button-blueX-down', this.blueX.bind(this));
      TeleopControl.on('button-redB-down', this.redB.bind(this));


      TeleopControl.on('button-shiftUp-down', this.shiftUp.bind(this));
      TeleopControl.on('button-shiftDown-down', this.shiftDown.bind(this));

      TeleopControl.on('button-crossUp-down', this.crossUp.bind(this));
      TeleopControl.on('button-crossDown-down', this.crossDown.bind(this));

      TeleopControl.on('button-crossLeft-down', this.crossLeft.bind(this));
      TeleopControl.on('button-crossRight-down', this.crossRight.bind(this));


      TeleopControl.on('button-start-down', this.startBtn.bind(this));
      TeleopControl.on('button-select-down', this.selectBtn.bind(this));

      this.controlProfiles = {};
      for (let c in ControlProfiles) {
        this.controlProfiles[ControlProfiles[c].matchId] = ControlProfiles[c];
        this.controlProfiles[ControlProfiles[c].matchId].internalId = c;
      }

      this.TeleopControl = TeleopControl;


    }

    setControlSpeedCallback(callback)
    {
      this.speedCallback=callback;
    }
    setSwitchCameraCallback(callback)
    {
      this.switchCameraCallback=callback;
    }
    setSpinCameraCallback(callback)
    {
      this.spinCameraCallback=callback;

    }
    setFullVideoCallback(callback)
    {

      this.fullVideoCallback=callback;

    }
    
    setRecordCallback(callback)
    {
      this.recordCallback=callback;
    }
 
    disableBreak()
    {
      console.log('Disabling brake');
      this.brakeSignal = 0;
    }

    applyBrake()
    {
      console.log('Applying brake!')
      this.brakeSignal = 1;
      this.forwardSpeed = 0;
      if(this.speedCallback)
      {
        this.speedCallback(0);
      }
      setTimeout(this.disableBreak.bind(this),2000);
    }
    greenA(value) {
      console.log('greenA, handbrake!');


      this.applyBrake();


    }
    yellowY(value) {
      console.log('yellowY!');

      if(this.switchCameraCallback)
        this.switchCameraCallback();
    }
    blueX(value) {
      console.log('blueX!');
      this.recordCallback('send');
     /* this.fullVideo=!this.fullVideo;
      console.log(this.fullVideoCallback);
      if(this.fullVideoCallback)
        this.fullVideoCallback(this.fullVideo);
      console.log('full video: ',this.fullVideo);*/

    }
    redB(value) {
      console.log('redB!');
      //reset pic
      console.log('Reseting pic 3 secs!');
      this.currentPowerSignal = 1;
      setTimeout(() => {
        this.currentPowerSignal = 0;
      }, 3000);


    }

      //Front is negative speed
    shiftUp() {


      if(this.enableControl)
      {
        this.steerLever--;
        if(this.steerLever<-1)
          this.steerLever=-1;

        console.log('steer!',this.steerLever);
        
       /* this.forwardSpeed+=this.speedFactor;
        if(this.forwardSpeed>=this.maxSpeed)
          this.forwardSpeed=this.maxSpeed;*/
      }
      else{
        console.log('Control disabled!');
        this.steerLever=0;
        //this.forwardSpeed=0;
      }


      if(this.speedCallback)
          this.speedCallback(this.forwardSpeed);

    }

    shiftDown() {
      if(this.enableControl)
      {
        this.steerLever++;
        if(this.steerLever>1)
        this.steerLever=1;
        console.log('Reduce speed!');
        /*this.forwardSpeed-=this.speedFactor;
        if(this.forwardSpeed<this.minSpeed)
          this.forwardSpeed=this.minSpeed;*/
      }
      else{
        console.log('Control disabled!');
        this.steerLever=0;
        //this.forwardSpeed=0;
      }

      if(this.speedCallback)
          this.speedCallback(this.forwardSpeed);
    }

    crossUp() {
      console.log('Cross up!');
    }

    crossDown() {
      console.log('Cross down!');
    }

    crossLeft() {
      console.log('Cross left!');
      console.log('Prev robot');
      this.monitorSelector.selectPrevMonitor();
    }


    crossRight() {
      console.log('Cross right!');
      console.log('Next robot');
      this.monitorSelector.selectNextMonitor();
    }
    startBtn()
    {
      console.log("Start button");

      //this.fullVideo=!this.fullVideo;
      //console.log(this.fullVideoCallback);
      if(this.fullVideoCallback)
        this.fullVideoCallback();
     // console.log('full video: ',this.fullVideo);
     // this.monitorSelector.selectStart();
    }
    selectBtn()
    {
      console.log("Select button");
      //this.monitorSelector.selectBack();
    }

    stop()
    {
      this.forwardSpeed=0;
      this.turnSpeed=0;
      this.brakeSignal=0;
    }

    initApplication() {
      console.log('Starting control container');
      this.createController();
      setInterval(this.Update.bind(this),100,100);
    }

    getProfile(gamepadName) {
      for (let p in this.controlProfiles) {
        if (gamepadName.includes(p)) {
          return this.controlProfiles[p];
        }
      }
      return false;
    }
    nextGamepad() {
      const lastIndex = Number(this.currentGamepadIndex) || 0;
      this.removeGampead();
      const gamepads = navigator.getGamepads();
      let testGamepad = lastIndex + 1;
      let tested = 0;
      while (!this.currentController && tested < gamepads.length - 1) {
        if (testGamepad >= gamepads.length) {
          testGamepad = 0;
        }
        if (testGamepad === lastIndex) {
          break;
        }
        if (this.assignGamepad(gamepads[testGamepad])) {
          break;
        }
        testGamepad++;
        tested++;
      }
      if (!this.currentController) {
        this.assignGamepad(gamepads[lastIndex]);
      }
      console.log(this.currentController);

    }
    assignGamepad(gamepad) {
      if (!gamepad) {
        return false;
      }
      console.log(gamepad.id);
      const profile = this.getProfile(gamepad.id);
      if (!profile) {
        return false;
      }
      if (this.currentController) {
        this.removeGampead();
      }
      this.gamepadConnected=true;
      this.currentGamepadIndex = gamepad.index;
      this.currentController = new ControlMapper(this.TeleopControl, navigator.getGamepads()[gamepad.index], profile);
      this.currentController.startPolling(20);
      this.currentController.rumble(100, 1, 1);
      return true;
    }
    removeGampead() {
      if (this.currentController) {
        this.currentController.destroy();
        this.currentController = null;
        this.currentGamepadIndex = null;
        this.gamepadConnected=false;
      }
    }

    setCameraSpin(RX,RY) {
      var degrees=0;
      var thresh=0.15;
      if((RX>-thresh && RX<thresh) && (RY>-thresh && RY<thresh))
      {
        //degrees=-167;
        degrees=this.movCam;
      }
      else {

        var radians = Math.atan2(RY, RX);
        degrees = radians /Math.PI * 180+90;
        if(degrees>180)
          degrees-=360;
        degrees=Math.round(degrees);

        //console.log('RX: ', RX);
        //console.log('RY: ', RY);
      //console.log('Spin camera: ',degrees);

      }

      this.movCam=degrees;
      if(this.spinCameraCallback)
        this.spinCameraCallback(degrees)
    }


    Update(deltaTime) {


        let steer = this.TeleopControl.axes.steer.value;
        let RX = this.TeleopControl.axes.RX.value;
        let RY = this.TeleopControl.axes.RY.value;

        let accel = this.TeleopControl.axes.accel.value.toFixed(1)*100;
        //console.log('accel',accel);

        

        this.setCameraSpin(RX,RY);
        this.turnSpeed=Math.round(steer*this.angleFactor);
        //if(!isNaN(this.turnSpeed))
          //this.turnSpeed=0;
        this.forwardSpeed=this.steerLever*accel;
       
        
        if(this.TeleopControl.axes.record.value>0.7)
        {
          if(!this.startRecord)
          {
            this.startRecord=true;
            if(this.recordCallback)
              this.recordCallback('pressed');
          }
          
        }
        if(this.startRecord)
        {
          if(this.TeleopControl.axes.record.value==0)
          {
            this.startRecord=false;
            if(this.recordCallback)
              this.recordCallback('released');
          }

        }

      //console.log('Angle: ',this.turnSpeed);
      //console.log('forward speed: ',this.forwardSpeed);
      //console.log('turn speed: ',this.turnSpeed);
      //console.log(navigator.getGamepads());
    }
    setMonitorSelector(monitorSelector)
    {
      this.monitorSelector=monitorSelector;
    }
}
let controlContainer= new LightControlContainer();
controlContainer.initApplication();


if (navigator.getGamepads()[0]) { // Asign gamepad if already connected
  controlContainer.assignGamepad(navigator.getGamepads()[0]);
}

window.addEventListener("gamepadconnected", function (e) {
  if (!controlContainer) {
    return;
  }
  console.log("***********GAMEPAD CONNECTED**************");
  const gamepad = navigator.getGamepads()[e.gamepad.index];
  console.log(gamepad);
  controlContainer.assignGamepad(gamepad);
});

window.addEventListener("gamepaddisconnected", function (e) {
  if (!controlContainer) {
    return;
  }
  console.log("***********GAMEPAD DISCONNECTED**************");
  console.log(e.gamepad);
  controlContainer.stop();
  if (controlContainer.currentController.device.index === e.gamepad.index) {
    controlContainer.nextGamepad();
  }
});

document.addEventListener('keypress', (event) => {
  //var name = event.key;
  var code = event.code;
  console.log('Key pressed',code);
  if(code=='Space')
  {
    console.log('Space key pressed');
    if(controlContainer.fullVideoCallback!==undefined)
      controlContainer.fullVideoCallback();
  }
  // Alert the key name and key code on keydown
  
}, false);

export {controlContainer};
