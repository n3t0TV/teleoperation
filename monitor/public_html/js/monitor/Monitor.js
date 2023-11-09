
import * as config from "../config/config.js";
import { AFB } from "../audio/AudioFeedback.js";
import { monitorWatch } from './monitorWatch.js';

//let timedEvent = false;
import { monitorContainer } from './monitorContainer.js';
import { WebSpeechText } from '../audio/WebSpeechText.js';

//import { Watcher } from "./Watcher.js";

//const MOUSE_WHEEL_SPIN_CAMERA = true;
const VOLUME = 0;

//const TORTOPS_SERVER='//prod.tortops.com';
const VIDEO_HEIGHT = 300;
const VIDEO_RATIO = 16 / 9;
const WHEEL_MULTIPLIER = 0.2;

export const Monitors = {};




const isNullOrUndefined = value => value === null || value === undefined;

var oldcurrentPowerSignal = 0;

function getRandomIntInclusive(min, max) {
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);
  let randomNumber = randomBuffer[0] / (0xffffffff + 1);
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(randomNumber * (max - min + 1)) + min;
}

export class Monitor {
  constructor(vehicleMqtt, vehicle) {

    console.log("vehicle", vehicle);
    this.vehicle = vehicle;
    this.id = vehicle.ID;
    this.imei = vehicle.IMEI;
    this.vehicleMqtt = vehicleMqtt;
    this.status = vehicle.status;
    Monitors[vehicle.IMEI] = this;
    this.allowTeleop = false;
    this.selected = false;
    this.recording = false;
    this.containersSku = {};
    this.teleopData = false;
    this.fullscreen = undefined


  }
  initializeDiv() {
    this.video = $(document.createElement('div'));
    this.audio = $(document.createElement('div'));

    this.watcher = new monitorWatch(this);
    this.watcher.startWatcher(this.imei, 'videoRoom');

    this.monitorContainer = new monitorContainer(this);

    this.webSpeech = new WebSpeechText(this);
    this.webSpeech.initialize();

    this.render();
    this.setSize(VIDEO_HEIGHT);

    //default values
    this.currentLightLevel = 0;
    this._spinCamera = -167;

    //this._spinCamera=window.controlClient.controlContainer.movCam;
    //this.exposure=window.controlClient.controlContainer.exposure;
  }

  initializeMqtt() {
    this.vehicleMqtt.subscribe(`sensor/${this.imei}`, this.onsensor.bind(this));
    this.vehicleMqtt.subscribe(`sensor/${this.imei}/monitor`, this.onmonitorsensor.bind(this));
    this.vehicleMqtt.subscribe(`vending/${this.imei}`, this.onvending.bind(this));

    console.log(`communication/${this.imei}/robot`);
    this.vehicleMqtt.subscribe(`communication/${this.imei}/robot`, this.onCommunicationRobot.bind(this));
    //para ready for payments container/all/updates
    //Toggle on/off endpoint/stored procedure

    this.monitorContainer.suscribeContainers();
    //this.suscribeContainers();

    this.sendInstruction({
      command: 'FB'
    });
    this.connected = true;
  }

  reloadStatus(status) {

    console.log('**TELEOP SESSION: **');
    this.watcher.close();
    //delete this.watcher;

    this.div.remove();

    if (this.map) {
      this.mapInstance.off();
      this.mapInstance.remove();
      this.map.remove();
      this.map = false;
    }

    this.status = status;
    this.initializeDiv();
  }


  /*sendUrl() {
      console.log(`Sending URL to ${this.id}`);
      //this.sendInstruction({ command: 'VC', url: `https://${location.host}/broadcaster.html` });
  }*/

  setSize(videoHeight) {
    const videoWidth = Math.round(videoHeight * VIDEO_RATIO);
    this.video.css({
      height: `${videoHeight}px`,
      width: `${videoWidth}px`
    });

    this.div.css({
      height: `${videoHeight + 72}px`,
      width: `${videoWidth + 130}px`
    });
  }

  toggleAudio() {
    if (this.audioMenu) {
      this.audioBtn.removeClass('bg-primary');
      this.audioMenu.remove();
      this.audioMenu = false;
      return;
    }
    this.audioBtn.addClass('bg-primary');
    this.audioMenu = $('<div>').addClass('audio-menu').appendTo(this.div);
    for (const audioItem of AUDIOS_LIST) {
      const div = $('<div>').addClass('audio-item').appendTo(this.audioMenu);
      div.html(audioItem.short);
      div.attr('title', audioItem.text);
      div.on('click', () => {
        this.sendInstruction({ command: 'SK', id: String(audioItem.id) });
        const playindicator = $('<div>').addClass('audio-playing');
        div.prepend(playindicator).addClass('click-disabled');
        setTimeout(() => {
          playindicator.remove();
          div.removeClass('click-disabled');
        }, 3000);
      });
    }
  }

  render() {
    this.div = $('<div>').addClass('monitor-div');

    this.endBtn = $('<button>').addClass('btn btn-default monitor-close').html('<i class="fad fa-window-close"></i>');

    this.title = $('<div>').addClass('monitor-title').appendTo(this.div);

    //this.watchers = $('<span>').addClass('monitor-watchers').appendTo(this.title).html('<i class="fad fa-eye"></i>');



    this.record = $('<button>').addClass('monitor-record').addClass('start-recording').appendTo(this.title).html('🔴').click(() => {
      this.toggleRecord();
    });

    //  this.speedText = $('<span>').addClass('text-success monitor-speed').html('0 m/s').appendTo(this.title);


    this.download = $('<a>').attr('href', '#').hide().appendTo(this.title).html('Download!');


    this.batteryIndicator = $('<span>').appendTo(this.title);
    this.battery = this.vehicle.battery;
    const id = $('<span>').html(`&nbsp;&nbsp;${this.id}`).appendTo(this.title);
    const imei = $('<span>').html(` <i class="fad fa-barcode-alt"></i> ${this.imei}`).appendTo(this.title);

    console.log("THIS:VEHICLE:", this.vehicle);

    const versionText = this.vehicle.runningSource ? 'SOURCE' : this.vehicle.versions.brain;
    const branCommit = this.vehicle.versions.brainCommit === undefined ? 'N/A' : this.vehicle.versions.brainCommit;
    const firmware = this.vehicle.versions.firmware === undefined ? 'N/A' : this.vehicle.versions.firmware;
    $('<span>').html(` <i class="fad fa-brain"></i> ${versionText}`).appendTo(this.title);
    $('<span>').html(` <i class="fad fa-robot"></i> ${firmware}`).appendTo(this.title);
    $('<span>').html(` <i class="fad fa-code-commit"></i> ${branCommit}`).appendTo(this.title);

    this.video.appendTo(this.div).addClass('monitor-video');
    this.video.attr("id", "removeVideo" + this.imei);
    this.audio.appendTo(this.div).addClass('monitor-video');
    this.audio.attr("id", "removeAudio" + this.imei);

    this.wagonView = $('<div>').addClass('wagon-view').appendTo(this.div);
    this.wagonViewSvg = $('<img>').addClass('wagon-view-svg').attr('src', 'img/wagonTop.svg').appendTo(this.wagonView);
    this.containers = {};

    // this.monitorContainer.renderContainer(1);
    // this.monitorContainer.renderContainer(2);



    this.cameraFrontIndicator = $('<div>').addClass('monitor-front-camera monitor-camera-indicator camera-front').html('<span class="monitor-camera-indicator camera-front"><i class="fad fa-video"></i>').appendTo(this.wagonView);
    this.cameraZoomIndicator = $('<div>').addClass('monitor-zoom-camera monitor-camera-indicator camera-zoom').html('<span class="monitor-camera-indicator camera-front"><i class="fad fa-video"></i>').appendTo(this.wagonView);
    this.spinCameraIndicator = $('<div>').addClass('monitor-spin-camera monitor-camera-indicator camera-spin').html('<span class="monitor-camera-indicator camera-front"><i class="fad fa-video"></i>').appendTo(this.wagonView);


    this.sensorFrontLeft = $('<div>').addClass('monitor-proximity-sensor sensor-front-left').html('<span class=""><i class="fad fa-circle"></i>').appendTo(this.wagonView);
    this.sensorFrontCenter = $('<div>').addClass('monitor-proximity-sensor sensor-front-center').html('<span class=""><i class="fad fa-circle"></i>').appendTo(this.wagonView);
    this.sensorFrontRight = $('<div>').addClass('monitor-proximity-sensor sensor-front-right').html('<span class=""><i class="fad fa-circle"></i>').appendTo(this.wagonView);

    this.sensorBackLeft = $('<div>').addClass('monitor-proximity-sensor sensor-back-left').html('<span class=""><i class="fad fa-circle"></i>').appendTo(this.wagonView);
    this.sensorBackCenter = $('<div>').addClass('monitor-proximity-sensor sensor-back-center').html('<span class=""><i class="fad fa-circle"></i>').appendTo(this.wagonView);
    this.sensorBackRight = $('<div>').addClass('monitor-proximity-sensor sensor-back-right').html('<span class=""><i class="fad fa-circle"></i>').appendTo(this.wagonView);



    this.toolbar = $('<div>').addClass('monitor-toolbar').appendTo(this.div);



    this.exposure = $('<div>').addClass('monitor-exposure').appendTo(this.toolbar);
    this.autoExposureBtn = $('<button>').addClass('monitor-exposure-auto').html('<i class="fad fa-volume-up"></i>').addClass('btn btn-default').appendTo(this.exposure);
    this.volumeSlider2 = $('<input>').addClass('monitor-exposure-input').attr({ type: 'range', min: 0, max: 100, value: this.vehicle.data.volume }).appendTo(this.exposure);

    this.volume = $('<div>').addClass('monitor-volume');//.appendTo(this.toolbar);
    this.muteBtn = $('<button>').addClass('monitor-mute').html('<i class="fad fa-volume-mute"></i>').addClass('btn btn-default').appendTo(this.volume);
    this.muteBtn.css('margin-right', '5px');
    this.volumeSlider = $('<input>').addClass('monitor-volume-input disabled').attr({ type: 'range', min: 0, max: 100, value: 100 }).appendTo(this.volume);



    this.camera1 = $('<button>').html('1 <span class="monitor-camera-indicator camera-front"><i class="fad fa-video"></i></span>').addClass('btn btn-default monitor-camera-btn ').appendTo(this.toolbar);

    this.camera2 = $('<button>').html('2 <span class="monitor-camera-indicator camera-spin"><i class="fad fa-video"></i></span>').addClass('btn btn-default monitor-camera-btn ').appendTo(this.toolbar);


    this.camera3 = $('<button>').html('3 <span class="monitor-camera-indicator camera-zoom"><i class="fad fa-video"></i></span>').addClass('btn btn-default monitor-camera-btn ').appendTo(this.toolbar);
    this.camera3.css('margin-right', '5px');
    //this.camera3.hide();

    this.frontLight = $('<button>').html('<span class="monitor-camera-indicator front-light"><i class="fa fa-lightbulb "></i></span>').addClass('btn btn-default monitor-camera-btn ').appendTo(this.toolbar);
    this.frontLight.css('margin-right', '5px');


    console.log('Status!!!' + this.status);

    this.mapBtn = $('<button>').html('<i class="fad fa-map-marked-alt fa-border-none"></i>').addClass('btn btn-default').appendTo(this.toolbar);
    this.audioBtn = $('<button>').html('<i class="fad fa-bullhorn"></i>').addClass('btn btn-default').appendTo(this.toolbar);

    this.microphoneBtn = $('<button>').html('<i class="fas fa-microphone"></i>').addClass('btn btn-default').appendTo(this.toolbar);
    this.arlinesdiv = false;

    this.activeCamera = 1;
    if (this.status == 6) {
      this.idleBtn = $('<button>').html('<i class="fas fa-stop fa-3x"></i>').addClass('btn btn-default idle-item').appendTo(this.div);
      const statusText = $('<span>').addClass('text-primary').html(` BT JOYSTICK`).appendTo(this.title);
      this.video.show();
      //this.watchers.show();
      //this.watchersCount.show();
      this.camera1.addClass('text-primary');
      this.frontLight.hide();
      //this.microphoneBtn.hide();
      //this.speedText.hide();


    }
    else {
      //this.camera3.hide();
      if (this.status == 3)//Idle
      {

        this.environmentBtn = $('<div>').html('<i class="fa fa-server fa-3x"></i>').addClass("btn btn-default environment-item").appendTo(this.div);
        this.powerBtn = $('<div>').html('<i class="fa fa-power-off fa-3x"></i>').addClass("btn btn-default power-item").appendTo(this.div);
        this.resetBtn = $('<div>').html('<i class="fa fa-rotate-right fa-3x"></i>').addClass("btn btn-default reset-item").appendTo(this.div);

        this.idleIcon = $('<div>').html('<i class="fad fa-snooze fa-10x"></i>').addClass("idle-background").appendTo(this.div);
        this.teleopBtn = $('<button>').html('<i class="fad fa-gamepad fa-3x"></i>').addClass('btn btn-default teleop-item').appendTo(this.div);
        this.joystickBtn = $('<button>').html('<i class="fa fa-video  fa-3x"></i>').addClass('btn btn-default bluetooth-item').appendTo(this.div);
        //<i class="fad fa-user  text-danger"></i>
        this.wagonView.hide();
        this.camera1.hide();
        this.camera2.hide();
        this.camera3.hide();
        this.frontLight.hide();
        this.record.hide();

        this.mapBtn.hide();
        this.video.hide();
        //this.watchers.hide();
        //this.watchersCount.hide();
        this.exposure.hide();
        this.volumeSlider2.hide();
        this.autoExposureBtn.hide();
        this.audioBtn.hide();
        this.volumeSlider.hide();
        this.muteBtn.hide()
        this.volume.hide();
        //this.speedText.hide();

        if (this.microphonePanel) {//close 
          this.toggleMicrophone();
        }
        this.microphoneBtn.hide();

        const statusText = $('<span >').addClass('text-warning').html(` IDLE`).appendTo(this.title);
      }
      else//Teleop
      {
        this.idleBtn = $('<button>').html('<i class="fas fa-stop fa-3x"></i>').addClass('btn btn-default idle-item').appendTo(this.div);
        const statusText = $('<span>').addClass('text-danger').html(` TELEOP`).appendTo(this.title);
        this.camera1.addClass('text-primary');
        if (this.allowTeleop) {
          var lockIcon = $('<span>').addClass('text-success').html(`<i class="fa fa-unlock"></i>`).css({ "margin-left": "10px" }).appendTo(this.title);

          //this.setupARLines();
          this.fullscreenMode();
          //Switch to front camera

          //this.setActiveCamera(0);
          //

        }
        else {
          var lockIcon = $('<span>').addClass('text-danger').html(`<i class="fa fa-lock"></i>`).css({ "margin-left": "10px" }).appendTo(this.title);

          this.exposure.hide();
          this.volumeSlider2.hide();
          this.autoExposureBtn.hide();
          //this.audioBtn.hide();
          this.volumeSlider.hide();
          this.muteBtn.hide()
          this.volume.hide();
          //First canvas retransmition
          /* this.camera1.addClass('text-primary');
           this.camera2.hide();
           this.camera3.hide();*/
          this.frontLight.hide();
          this.microphoneBtn.hide();
          //this.speedText.hide();
        }
        this.video.show();
        //this.watchers.show();
        //this.watchersCount.show();
      }

    }


    this.bindEvents();
  }



  selectMonitor() {
    this.div.css('border-color', 'red');
    this.selected = true;

  }
  unselectMonitor() {
    this.div.css('border-color', '#ebebeb');
    this.selected = false;

  }
  toggleMicrophone() {
    if (this.microphonePanel !== undefined) {
      this.microphonePanel.remove();
      this.microphonePanel = undefined;
      return;
    }

    this.microphonePanel = $('<div>');
    if (this.fullscreen !== undefined) {
      this.microphonePanel.addClass('microphone-panel-fscreen');
      this.microphonePanel.appendTo(this.fullscreen);
    }
    else {
      this.microphonePanel.addClass('microphone-panel');
      this.microphonePanel.appendTo(this.div);
    }



    this.webSpeech.renderMicrophonePanel(this.imei);
    //this.webSpeech.startButton(new Event("startEvent"));
  }


  toggleRestock() {

    if (this.restockPanel) {

      this.restockPanel.remove();
      this.restockWagonView.remove();
      this.restockPanel = false;
      this.restockBtn.removeClass('btn-primary');
      this.containersRestock = {};

      return;
    }

    if (Object.keys(this.containers).length == 0) {
      swal('This robot has no containers assigned!');
      return;
    }

    this.restockPanel = $('<div>').addClass('monitor-restock').appendTo(this.div);
    this.restockWagonView = $('<div>').addClass('wagon-view').appendTo(this.div);

    //this.restockWagonViewSvg = $('<img>').addClass('wagon-view-svg').attr('src', 'img/wagonTop.svg').appendTo(this.restockWagonView);



    this.restockBtn.addClass('btn-primary');
    this.containersRestock = {};
    // this.monitorContainer.renderContainerRestock(1);
    // this.monitorContainer.renderContainerRestock(2);

    // this.monitorContainer.refreshProductDetail(1);
    // this.monitorContainer.refreshProductDetail(2);
    //this.containerBg = $('<div>').addClass('wagon-container-bg').appendTo(containerRender.restockContainer1);

  }

  downloadVideo(blob) {
    console.log('Updating href');
    this.download.attr('href', URL.createObjectURL(blob));
    this.download.attr('download', `${Date.now()}.mp4`);
    this.download.get(0).click();
  }

  toggleRecord() {

    if (this.recording) {
      console.log('Stop recording!');
      this.recording = false;
      this.record.html('🔴');
      //this.download.attr('href',"");
      //this.download.attr('download',"");
      this.watcher.stopRecording();
    }
    else {
      console.log('Start recording!');
      this.recording = true;
      this.record.html('⬛');
      this.watcher.startRecording();
    }

  }


  toggleMap() {
    if (this.map) {
      this.mapInstance.off();
      this.mapInstance.remove();
      this.map.remove();
      this.map = false;
      this.mapBtn.removeClass('btn-primary');
      return;
    }
    const baseLayers = {
      'satelite': new L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }),
      'street': L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      })
    }
    const location = this.vehicle.gps;
    console.log("THIS.VEHICLE:", this.vehicle);
    this.map = $('<div>').addClass('monitor-map').appendTo(this.div);
    this.mapInstance = L.map(this.map[0],
      {
        center: [location.lat, location.lon],
        zoom: 15, layers: [
          baseLayers.street
        ]
      });
    this.marker = L.marker([location.lat, location.lon]).addTo(this.mapInstance);
    this.mapBtn.addClass('btn-primary');
  }
  sendStatus(status) {
    $.post('set-status',
      {
        uid: this.id,
        imei: this.imei,
        status: status,
      })
      .done(data => {
        console.log('Monitor status changed!!');
      })
      .fail(e => {
        //  swal.fire('Error', '', 'error');
        console.log("Error updating status!: ", e);
      });
  }

  disableAllowTeleop() {
    if (this.allowTeleop) {
      this.allowTeleop = false;
      this.endMonitorTeleop();
      //  this.reloadStatus(this.status)
    }

  }

  updateSpinCamera(angle) {
    if (this.allowTeleop) {
      //this.spinCamera=angle;
      this.spinCameraIndicator.css('transform', `rotate(${angle - 90}deg)`);

      //send mqtt commandazsssssssss
      if (this._spinCamera !== angle) {
        this.sendInstruction({ command: 'MN', spin: angle });
        this._spinCamera = angle;
      }
    }
  }

  refreshControlPanel() {

    //this.monitor.refreshControlPanel(controlContainer.forwardSpeed,controlContainer.turnSpeed,controlContainer.brakeSignal);

    /*console.log("Refreshing control panel!",window.controlClient.controlContainer.forwardSpeed,window.controlClient.controlContainer.turnSpeed,window.controlClient.controlContainer.brakeSignal);
    //this.fullscreenControl.empty();
    //this.speedText = $('<span>').addClass('text-success control-text').html(forwardSpeed+' m/s').appendTo(this.fullscreenControl);
    console.log('socket joystick ',window.controlClient.socketJoystickConnected);
    console.log('gamepad connnected ',window.controlClient.controlContainer);
    console.log('socket sensor ',window.controlClient.socketSensorsConnected);*/
    //this.gamepadConnected
    //Joystick connected and web socket connected!
    if (window.controlClient.socketJoystickConnected == true && window.controlClient.controlContainer.gamepadConnected) {
      this.joystickReadyText.html('Joystick ✅<br>');
    }
    else {
      this.joystickReadyText.html('Joystick ❌<br>');
    }
    if (window.controlClient.currentSensor.batteryLevel !== undefined)
      this.batteryText.html('Battery🔋 ' + window.controlClient.currentSensor.batteryLevel + '%<br>');

    if (this.speedLeverText !== undefined) {
      let steerText;
      if (window.controlClient.controlContainer.steerLever == 1) {
        steerText = 'R <br>';
      }
      else if (window.controlClient.controlContainer.steerLever == -1) {
        steerText = 'D <br>';
      }
      else {
        steerText = 'N <br>';
      }
      this.speedLeverText.html('Lever✇ ' + steerText);
    }
    if (this.forwardSpeedText !== undefined) {
      let speedIcon;
      if (window.controlClient.controlContainer.steerLever == -1) {
        speedIcon = '🔼 ';
      }
      else if (window.controlClient.controlContainer.steerLever == 1) {
        speedIcon = '🔽 ';
      }
      else {
        speedIcon = '⛔ ';
      }


      this.forwardSpeedText.html('Speed' + speedIcon + (window.controlClient.controlContainer.forwardSpeed / 100.0).toFixed(1) + 'm/s<br>');
    }
    if (this.turnSpeedText !== undefined) {
      let iconTurn;
      if (window.controlClient.controlContainer.turnSpeed < 0)
        iconTurn = '◀ ';
      else if (window.controlClient.controlContainer.turnSpeed > 0)
        iconTurn = '▶ ';
      else
        iconTurn = '☸ ';

      this.turnSpeedText.html('Turn' + iconTurn + window.controlClient.controlContainer.turnSpeed + ' °/s<br>');
    }
    // if(this.brakeSignalText!==undefined)
    //{

    if (window.controlClient.controlContainer.brakeSignal) {
      if (this.brakeSignalText == undefined) {
        this.brakeSignalText = $('<span>').addClass('control-text').html('Brake 🛑<br>').appendTo(this.fullscreenControl);
      }
      //this.brakeSignalText.html('Brake 🛑<br>');
    }
    else {
      if (this.brakeSignalText !== undefined) {
        this.brakeSignalText.remove();
        this.brakeSignalText = undefined;
      }
    }

    //}

    //console.log('sensor',window.controlClient.currentSensor);

    if (window.controlClient.currentSensor.failSafeMode == 1) {
      if (this.safeModeText == undefined) {
        this.safeModeText = $('<span>').addClass('control-text').html('Failed 🛡<br>').appendTo(this.fullscreenControl);
      }
      //this.safeModeText.html('Failed 🛡<br>');
    }
    else {
      if (this.safeModeText !== undefined) {
        this.safeModeText.remove();
        this.safeModeText = undefined;
      }
      //this.safeModeText.html('');
    }


    console.log("currentPowerSignal: ", window.controlClient.currentSensor.currentPowerSignal);
    if (window.controlClient.controlContainer.currentPowerSignal == 1) {
      if (this.resetText == undefined) {
        this.resetText = $('<span>').addClass('control-text').html('Reset ↺<br>').appendTo(this.fullscreenControl);
      }

      if (window.controlClient.currentSensor.currentPowerSignal != oldcurrentPowerSignal && oldcurrentPowerSignal == 0) {
        oldcurrentPowerSignal = window.controlClient.currentSensor.currentPowerSignal;
        console.log("SEND RST COMMAND");
        this.sendInstruction({
          command: 'RST'
        });
      }
    }
    else {
      oldcurrentPowerSignal = window.controlClient.currentSensor.currentPowerSignal;
      if (this.resetText !== undefined) {
        this.resetText.remove();
        this.resetText = undefined;
      }
      //this.resetText.html('');
    }


  }



  fullscreenMode() {
    console.log('Zoom video callback!!!');

    if (this.status == 5 && this.allowTeleop) {
      if (this.fullscreen !== undefined) {
        this.microphonePanel.remove();
        this.microphonePanel = undefined;

        this.fullscreen.remove();
        this.fullscreen = undefined;
        window.controlClient.controlContainer.updateEnableControl(false);
        clearInterval(this.controlpanelInterval);
        this.controlpanelInterval = undefined;

      }
      else {

        /*✅❌🛑🛡✇⚐🚄☸◀ ▶🔼🔽
        Safe mode 🛡
        Brake 🛑
        Reset ↺
        */
        this.fullscreen = $('<div>').attr('id', 'monitor-fullscreen');
        this.fullscreenVideo = this.video.clone();
        this.fullscreen.append(this.fullscreenVideo);
        this.fullscreenControl = $('<div>').attr('id', 'control-panel').addClass('fullscreen-control');
        //this.vehicleText=$('<span>').addClass('control-text').html('Vehicle 🦼<br>').appendTo(this.fullscreenControl);;
        this.joystickReadyText = $('<span>').addClass('control-text').html('Joystick ❌<br>').appendTo(this.fullscreenControl);
        this.batteryText = $('<span>').addClass('control-text').html('Battery🔋 <br>').appendTo(this.fullscreenControl);
        this.speedLeverText = $('<span>').addClass('control-text').html('Lever✇ N<br>').appendTo(this.fullscreenControl);
        //this.topSpeedText = $('<span>').addClass('control-text').html('Top 0 m/s<br>').appendTo(this.fullscreenControl);
        this.forwardSpeedText = $('<span>').addClass('control-text').html('Speed⛔ 0m/s<br>').appendTo(this.fullscreenControl);
        this.turnSpeedText = $('<span>').addClass('control-text').html('Turn ☸ 0°/s<br>').appendTo(this.fullscreenControl);

        /* this.brakeSignalText = $('<span>').addClass('control-text').html('').appendTo(this.fullscreenControl);
         this.safeModeText = $('<span>').addClass('control-text').html('').appendTo(this.fullscreenControl);
         this.resetText = $('<span>').addClass('control-text').html('').appendTo(this.fullscreenControl);*/

        this.toggleMicrophone();
        /*this.fullscreenControl.append(this.batteryText);
        this.fullscreenControl.append(this.forwardSpeedText);
        this.fullscreenControl.append(this.turnSpeedText);
        this.fullscreenControl.append(this.brakeSignalText);*/
        this.fullscreen.append(this.fullscreenControl);
        this.controlpanelInterval = setInterval(this.refreshControlPanel.bind(this), 100);

        $('main').append(this.fullscreen);
      }
      //Reload video after toggle
      this.watcher.close()
      this.watcher = new monitorWatch(this);
      this.watcher.startWatcher(this.vehicle.IMEI, 'videoRoom');
      //this.setupARLines();





    }




  }


  updateRecordEvent(state) {


    if (state == 'pressed') {
      this.webSpeech.pressRecordEvent();

    }
    else if (state == 'released') {
      this.webSpeech.releaseRecordEvent();
    }
    else if (state == 'send') {
      this.webSpeech.sendTeleopRecord();
    }

  }

  updateSpeedText(speed) {
    //console.log(speed);
    //this.speedText.html((speed/100.0).toFixed(1)+' m/s')
  }

  updateActiveCamera() {
    console.log("updateActiveCamera: ", this.activeCamera);
    const actCam = this.activeCamera;
    if (actCam == 0) {
      console.log('Activating mode 1');
      this.camera2.removeClass('text-primary');
      this.camera3.removeClass('text-primary');
      this.camera1.addClass('text-primary');
      this.setActiveCamera(1);
    }
    else if (actCam == 1) {
      console.log('Activating mode 2');
      this.camera1.removeClass('text-primary');
      this.camera3.removeClass('text-primary');
      this.camera2.addClass('text-primary');
      this.setActiveCamera(2);
    }
    else if (actCam == 2) {
      console.log('Activating mode 3');
      this.camera1.removeClass('text-primary');
      this.camera2.removeClass('text-primary');
      this.camera3.addClass('text-primary');
      this.setActiveCamera(0);
    }
    // else if(this.activeCamera == 3)
    // {
    //   console.log('Activating camera 1');
    //   this.camera1.removeClass('text-primary');
    //   this.camera3.removeClass('text-primary');
    //   this.camera2.addClass('text-primary');
    //   this.setActiveCamera(0);
    // }
  }
  startMonitorTeleop() {

    let idteleopsession = getRandomIntInclusive(100000, 999999);
    //let teleopid=window.userData.teleopId;

    //swal("Really!!");
    $.post('start-monitor-teleop',
      {
        uid: this.id,
        imei: this.imei,
        idteleopsesion: idteleopsession,
        idTeleop: window.userData.teleopId
      })
      .done(data => {
        console.log('Monitor status changed!!');
        this.allowTeleop = true;
        this.teleopData = data[0];
        window.controlClient.initClientConnection(idteleopsession, this.id, this.imei);
        window.controlClient.controlContainer.setControlSpeedCallback(this.updateSpeedText.bind(this));
        window.controlClient.controlContainer.setSwitchCameraCallback(this.updateActiveCamera.bind(this));
        window.controlClient.controlContainer.setSpinCameraCallback(this.updateSpinCamera.bind(this));
        window.controlClient.controlContainer.setFullVideoCallback(this.fullscreenMode.bind(this));
        window.controlClient.controlContainer.setRecordCallback(this.updateRecordEvent.bind(this));

        //Each monitor initializes again with status mqtt event (do not render anything here)




      })
      .fail(e => {
        //  swal.fire('Error', '', 'error');
        console.log("Error updating status!: ", e);
      });
  }
  endMonitorTeleop() {



    if (this.fullscreen !== undefined) {
      this.fullscreenMode();
    }
    $.post('end-monitor-teleop',
      {
        uid: this.id,
        imei: this.imei
      })
      .done(data => {
        this.allowTeleop = false;
        window.controlClient.controlContainer.applyBrake();
        setTimeout(() => {
          console.log('Ending teleop connection!');
          window.controlClient.endClientConnection()
        }, 2500);

        console.log('Monitor status changed!!');
      })
      .fail(e => {
        //  swal.fire('Error', '', 'error');
        console.log("Error updating status!: ", e);
      });
  }
  bindEvents() {

    console.log('Binding events to buttons!', this.status, this.joystickBtn, this.idleBtn, this.teleopBtn);
    //if (MOUSE_WHEEL_SPIN_CAMERA)
    //{
    console.log('Selected: ', this.selected)
    if (this.status == 6) {

      /* this.div[0].addEventListener('wheel', event => {
           if (this.cameraRoutineEnabled) {
               clearInterval(this.cameraRoutineInterval);
               this.cameraRoutineEnabled = false;
               this.spinCameraIndicator.removeClass('text-info');
           }
           const deltaY = event.deltaY;
           this.spinCamera += deltaY * WHEEL_MULTIPLIER;


       }, { passive: true })*/
    }
    else if (this.status == 5 && this.allowTeleop) {
      this.spinCameraIndicator.addClass('text-primary');

    }

    this.setupStatusEvents();

    this.setupExposureEvents();

    //this.setupAudioEvents();

    this.monitorContainer.setupContainerEvents();

    this.setupCamera1Event();
    this.setupCamera2Event();
    this.setupCamera3Event();

    this.mapBtn.click(() => {

      if (!this.map) {
        if (this.audioMenu) {
          this.toggleAudio();
        }
      }
      this.toggleMap();
    });



    /*this.spinCameraIndicator.on('click', event => {
        if (event.ctrlKey || event.metaKey) this.cameraRoutine();
    });*/

    this.microphoneBtn.click(() => {
      console.log('Microphone click!');
      this.toggleMicrophone();
    });
  }

  // downloadTwilioFile() {
  //   var element = document.createElement('a');
  //   element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(window.TwilioDataContainer));
  //   element.setAttribute('download', "TwilioData.csv");

  //   element.style.display = 'none';
  //   document.body.appendChild(element);

  //   element.click();

  //   document.body.removeChild(element);
  //   window.TwilioDataContainer = "";
  // }

  // getHistoricFileHeader()
  // {
  //     let content_initial = "RoomName,Level,";
  //     let content_audio_sendStats = "Audio_Level,Audio_SendStats_bandwidth,Audio_SendStats_bandwidth_Level,Audio_SendStats_Latency_Jitter,Audio_SendStats_Latency_Level,";
  //     let content_audio_recvStats = "Audio_RecvStats_bandwidth_Level,Audio_RecvStats_Latency_Jitter,Audio_RecvStats_Latency_Level,";
  //     let content_video_sendStats = "Video_Level,Video_SendStats_bandwidth,Video_SendStats_bandwidth_Level,Video_SendStats_Latency_Jitter,Video_SendStats_Latency_Level,";
  //     let content_video_recvStats = "Video_RecvStats_bandwidth_Level,Video_RecvStats_Latency_Jitter,Video_RecvStats_Latency_Level,";
  //     let content_extra = "Timestamp,Gps_lan,Gps_lon\n";
  //     let content = content_initial + content_audio_sendStats + content_audio_recvStats + content_video_sendStats + content_video_recvStats + content_extra;
  //     return content;
  // }

  setupStatusEvents() {
    this.endBtn.on('click', this.close.bind(this)).appendTo(this.div);

    if (this.joystickBtn) {
      this.joystickBtn.on('click', () => {
        console.log('Joystick click!');

        this.sendStatus(6);

      });
    }

    if (this.idleBtn) {
      this.idleBtn.on('click', () => {
        console.log('Idle click!');
        if (this.status == 5) {
          Swal.fire({
            title: 'End teleoperation',
            text: "This will stop an active session. Are you sure?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'End session'
          }).then((result) => {
            if (result.isConfirmed) {

              // if(window.TwilioDataContainer !== this.getHistoricFileHeader())
              // {
              //   Swal.fire({
              //     title: 'Twilio Data Found!',
              //     text: "Do you want to download it?",
              //     icon: 'warning',
              //     showCancelButton: true,
              //     confirmButtonColor: '#3085d6',
              //     cancelButtonColor: '#d33',
              //     confirmButtonText: 'Download'
              //   }).then((result) => {
              //     if (result.isConfirmed) {

              //       downloadTwilioFile();
              //      }
              //    });
              // }

              this.endMonitorTeleop();
              //Swal.fire('Restarting!!');
            }
          });
        }
        else {
          this.sendStatus(3);
        }
      });
    }
    if (this.teleopBtn) {
      this.teleopBtn.on('click', () => {
        console.log('Monitor teleop');
        window.monitorSelector.clearAllowTeleop();
        this.startMonitorTeleop();
      });
    }
    if (this.resetBtn) {
      this.resetBtn.on('click', () => {
        console.log('Restart robot!');
        this.restartRobot();
      });
    }
    if (this.powerBtn) {
      this.powerBtn.on('click', () => {
        console.log('Power off robot!');
        this.powerOffRobot();
      });
    }
    if (this.environmentBtn) {
      this.environmentBtn.on('click', () => {
        console.log('changing environment!');
        this.changeEnvironment();
      });
    }
  }

  setupAudioEvents() {
    this.volumeSlider.on('change', () => {
      if (isNullOrUndefined(this.watcher.getAudio())) return;

      this.watcher.unmute();
      this.muteBtn.html('<i class="fad fa-volume"></i>').addClass('btn-primary');
      this.volumeSlider.removeClass('disabled');
      this.watcher.volume = this.volumeSlider.val();
    });

    this.muteBtn.on('click', () => {
      if (isNullOrUndefined(this.watcher.getAudio())) return;


      if (this.watcher.getAudio().muted) {
        this.watcher.unmute();
        this.muteBtn.html('<i class="fad fa-volume"></i>').addClass('btn-primary');
        this.volumeSlider.removeClass('disabled');
      } else {
        this.watcher.mute();
        this.muteBtn.html('<i class="fad fa-volume-mute"></i>').removeClass('btn-primary');
        this.volumeSlider.addClass('disabled');
      }

    });
    this.audioBtn.click(() => {

      if (!this.audioMenu) {
        if (this.map) {
          this.toggleMap();
        }
      }
      this.toggleAudio();
    });
  }

  setupExposureEvents() {
    // const setExposure = () => {

    //     console.log('Sending exposure!');
    //     this.sendInstruction({
    //         command: 'MN',
    //         exposure: VOLUME[this.exposureSlider.val()]
    //     });
    //     this.exposureSlider.removeClass('disabled');
    //     this.autoExposureBtn.html('<i class="fad fa-sun"></i>');
    //     this.exposure = VOLUME[this.exposureSlider.val()];
    //     window.controlClient.controlContainer.exposure=this.exposure;

    // };

    const setVolume = () => {

      console.log('Sending volume!', this.volumeSlider2.val());
      this.sendInstruction({
        command: 'SV',
        vol: this.volumeSlider2.val()
      });
      this.volumeSlider2.removeClass('disabled');
      this.exposure = this.volumeSlider2.val();
      window.controlClient.controlContainer.exposure = this.exposure;

    };

    // this.autoExposureBtn.on('click', () => {
    //     if (this.exposure === -1) {
    //         setExposure();
    //     } else {

    //         this.sendInstruction({
    //             command: 'MN',
    //             exposure: -1
    //         });
    //         this.exposureSlider.addClass('disabled');
    //         this.autoExposureBtn.html('A');
    //         this.exposure = -1;
    //        window.controlClient.controlContainer.exposure=this.exposure;
    //     }
    // });

    this.volumeSlider2.on('change', setVolume);

    this.frontLight.on('click', () => {
      console.log('Front light click!');
      if (this.currentLightLevel > 0) {
        this.currentLightLevel = 0;
        this.frontLight.removeClass('text-primary');

      } else {

        this.currentLightLevel = 90;
        this.frontLight.addClass('text-primary');

      }
      window.controlClient.controlContainer.currentLightLevel = this.currentLightLevel;
    });
  }



  setActiveCamera(camIndex) {
    console.log('Activating camera index: ', camIndex);
    this.activeCamera = camIndex;
    this.sendInstruction({
      command: 'MN',
      camera: camIndex
    });
  }

  setupCamera1Event() {
    this.camera1.on('click', () => {

      this.camera3.removeClass('text-primary');
      this.camera2.removeClass('text-primary');
      this.camera1.addClass('text-primary');

      this.setActiveCamera(0);
      /* if(this.status==6)
       {
         this.setActiveCamera(0);

       }
       else if(this.status==5)
       {//teleop mode change room
         //this.watcher.changeRoom('videoRoom',this.imei);
         if( this.allowTeleop)
         {
           console.log("Setting front camera!!");

           this.setActiveCamera(0);
           //this.setupARLines();
         }
         else
         {
           this.watcher.close()

           this.watcher = new monitorWatch(this);
           this.watcher.startWatcher(this.vehicle.IMEI,'videoRoom');

         }

       }
       else {
         //Idle
       }*/
    });
  }

  setupCamera2Event() {

    this.camera2.on('click', () => {

      this.camera3.removeClass('text-primary');
      this.camera1.removeClass('text-primary');
      this.camera2.addClass('text-primary');
      this.setActiveCamera(1);
      /* if(this.status==6)
       {

         this.setActiveCamera(1);
       }
       else if(this.status==5)
       {//teleop mode change room
         if(this.allowTeleop)
         {
           console.log("Setting rotating camera!!");
           this.setActiveCamera(1);
           //this.setupARLines();
         }
         else {
           this.watcher.close()
           this.watcher = new monitorWatch(this);
           this.watcher.startWatcher(this.vehicle.IMEI,'videoRoomAlt');
           //this.watcher.changeRoom('videoRoomAlt',this.imei);

         }
       }*/
    });
  }

  setupCamera3Event() {

    this.camera3.on('click', () => {

      this.camera2.removeClass('text-primary');
      this.camera1.removeClass('text-primary');
      this.camera3.addClass('text-primary');

      this.setActiveCamera(2);
    });
  }

  publishCommunication(data, type) {
    console.log("publishCommunication IMEI: ", this.imei);
    this.vehicleMqtt.publish(`communication/${this.imei}/${type}`, JSON.stringify(data));
  }


  sendInstruction(data) {
    this.vehicleMqtt.publish(`instruction/${this.imei}`, JSON.stringify(data));
  }
  appendTo(target) {
    this.div.appendTo(target);
  }

  monitorIndex() {
    return this.div.index();
  }

  onsensor(jsonmessage) {
    const message = JSON.parse(jsonmessage);
    if (typeof message.id != 'string') {
      return false;
    }
    const id = message.id;
    if (!message.lock) {
      this.containers[id].containerOpen.addClass('text-success');
      this.containers[id].containerOpen.removeClass('text-warning');
      this.containers[id].containerOpen.html(`<i class="fad fa-box"></i>`);
      this.containers[id].container.removeClass('open');

    } else {
      this.containers[id].containerOpen.removeClass('text-success');
      this.containers[id].containerOpen.addClass('text-warning');
      this.containers[id].containerOpen.html(`<i class="fad fa-box-open"></i>`);
      this.containers[id].container.addClass('open');
    }

    if (message.battery > 87) {
      this.containers[id].battery.html(`<i class="fad fa-battery-full"></i>`).removeClass().addClass('wagon-container-battery  text-success');
    } else if (message.battery > 62) {
      this.containers[id].battery.html(`<i class="fad fa-battery-three-quarters"></i>`).removeClass().addClass('wagon-container-battery  text-success');
    } else if (message.battery > 37) {
      this.containers[id].battery.html(`<i class="fad fa-battery-half"></i>`).removeClass().addClass('wagon-container-battery  text-success');
    } else if (message.battery > 12) {
      this.containers[id].battery.html(`<i class="fad fa-battery-quarter"></i>`).removeClass().addClass('wagon-container-battery  text-warning');
    } else {
      this.containers[id].battery.html(`<i class="fad fa-battery-empty"></i>`).removeClass().addClass('wagon-container-battery  text-danger');
    }
    this.containers[id].battery.attr('title', `${message.battery}%`);

  }
  onmonitorsensor(jsonmessage) {

    if (this.status == 6) {
      const message = JSON.parse(jsonmessage);
      console.log("onmonitorsensor MESSAGE: ", message);
      if (message.spin) {
        clearTimeout(this.remoteSpinTimeout);
        this.remoteSpinTimeout = setTimeout(() => {
          this._spinCamera = Number(message.spin);
          this.spinCameraIndicator.css('transform', `rotate(${this._spinCamera - 90}deg)`);
        }, 800);

      }

      // if (message.exposure) {
      //     if (message.exposure > -1) {
      //         this.exposureSlider.val(VOLUME.indexOf(Number(message.exposure)));
      //         this.exposureSlider.removeClass('disabled');
      //         this.autoExposureBtn.html('<i class="fad fa-sun"></i>');
      //     } else {
      //         this.exposureSlider.addClass('disabled');
      //         this.autoExposureBtn.html('A');
      //     }
      // }

      if (message.list_cameras) {
        for (const cameraLabel of message.list_cameras.desired) {
          const htmlSelector = `.${cameraLabel.replace(/_/g, '-')}`
          if (message.list_cameras.actual.includes(cameraLabel)) {
            $(htmlSelector).removeClass('text-danger').html('<i class="fad fa-video"></i>');
          } else {
            $(htmlSelector).addClass('text-danger').html('<i class="fad fa-video-slash"></i>');
          }
        }
        if (message.curr_camera) {

          $('.actual-camera-indicator').html(message.list_cameras.desired[message.curr_camera.current]);
          $('.monitor-camera-indicator').removeClass('text-primary');
          $(`.${message.list_cameras.desired[message.curr_camera.current]}`.replace(/_/g, '-')).addClass('text-primary');
        }
      }
    }

  }

  set battery(v) {
    this._battery = v;

    if (this._battery > 87) {
      this.batteryIndicator.html(`<i class="fad fa-battery-full"></i>`).removeClass().addClass('text-success');
    } else if (this._battery > 62) {
      this.batteryIndicator.html(`<i class="fad fa-battery-three-quarters"></i>`).removeClass().addClass('text-success');
    } else if (this._battery > 37) {
      this.batteryIndicator.html(`<i class="fad fa-battery-half"></i>`).removeClass().addClass('text-success');
    } else if (this._battery > 12) {
      this.batteryIndicator.html(`<i class="fad fa-battery-quarter"></i>`).removeClass().addClass('text-warning');
    } else {
      this.batteryIndicator.html(`<i class="fad fa-battery-empty"></i>`).removeClass().addClass('text-danger');
    }
    this.batteryIndicator.attr('title', `${this._battery}%`);

  }
  get battery() {
    return this._battery;
  }

  onvending(jsonmessage) {
    const message = JSON.parse(jsonmessage);
    switch (message.event) {
      case 'payment':
        console.log("ON VENDING DATA: ", message);
        this.onvendingevent(message);
        break;
    }
  }

  onCommunicationRobot(jsonmessage) {
    console.log('***onCommunicationRobot***');
    console.log(jsonmessage);
    let data = JSON.parse(jsonmessage);


    this.webSpeech.translateText(data.text, "es").done((data) => {

      console.log(data);
      var txt = document.createElement("textarea");
      txt.innerHTML = data.data.translations[0].translatedText;

      let playAudio = false, showBanner = false;

      if (this.fullscreen !== undefined) {
        playAudio = true;
        showBanner = true;
      }
      else {
        if (this.microphonePanel)//panel opened!
        {
          playAudio = true;
        }
      }

      this.webSpeech.displayRobotMessage(data.text, txt.value, playAudio, showBanner);

    });

  }

  onvendingevent(data) {
    console.log("ONVENDING: ", data);
    switch (data.status) {
      case 'approved':
        this.containers[data.containerNum].card.addClass('payment-success');
        this.div.addClass('success');
        setTimeout(() => {
          this.containers[data.containerNum].card.removeClass('payment-success');
          this.div.removeClass('success');
        }, 1100);

        //Save in container dict
        if (this.containersSku[data.containerNum]) {
          console.log('New quantity', data.productInStock);
          this.containersSku[data.containerNum].quantity = data.productInStock;
        }
        //Update if visible
        if (this.restockPanel) {
          this.refreshProductDetail(data.containerNum);
        }
        //productInStock
        //Actualizacion de producto
        /*this.containers[data.containerNum].productQ.html(data.stock);
        if (data.stock <= 0) {
            this.containers[data.containerNum].productQ.addClass('depleted');
        } else {
            this.containers[data.containerNum].productQ.removeClass('depleted');
        }*/
        AFB.kaching.play();
        break;
      /*  case 'declined':
            this.containers[data.containerNum].card.addClass('payment-error');
            this.div.addClass('failed');
            setTimeout(() => {
                this.containers[data.containerNum].card.removeClass('payment-error');
                this.div.removeClass('failed');
            }, 1100);
            AFB.wrong.play();
            break;
        case 'out of stock':
            this.containers[data.containerNum].productQ.addClass('stock-warning');
            this.div.addClass('warning');
            setTimeout(() => {
                this.containers[data.containerNum].productQ.removeClass('stock-warning');
                this.div.removeClass('warning');
            }, 1100);
            AFB.stomp2.play();

            if (data.stock <= 0) {
                this.containers[data.containerNum].productQ.addClass('depleted');
            } else {
                this.containers[data.containerNum].productQ.removeClass('depleted');
            }
            break;

        case 'restock':
            this.containers[data.containerNum].productQ.addClass('stock-recharge');
            this.div.addClass('info');
            setTimeout(() => {
                this.containers[data.containerNum].productQ.removeClass('stock-recharge');
                this.div.removeClass('info');
            }, 1100);
            AFB.recharge.play();
            const currentStock = Number(this.containers[data.containerNum].productQ.html());
            //for(s = ); s<= data.stock; s++)
            if (data.stock < currentStock) {
                this.containers[data.containerNumcontainerNum].productQ.html(data.stock);
            } else {
                const step = Math.floor(100 * (data.stock - currentStock) / 30) / 100;
                clearInterval(this.restockInterval);
                this.restockInterval = setInterval(() => {
                    let cs = Number(this.containers[data.containerNum].productQ.html());
                    const nv = Math.round((cs + step) * 100) / 100;
                    this.containers[data.containerNum].productQ.html(nv);
                    if (nv >= data.stock) {
                        this.containers[data.containerNum].productQ.html(data.stock);
                        clearInterval(this.restockInterval);
                    }
                }, 100);
            }





            if (data.stock <= 0) {
                this.containers[data.id].productQ.addClass('depleted');
            } else {
                this.containers[data.id].productQ.removeClass('depleted');
            }

            break;*/
    }
  }

  cameraRoutine() {
    clearInterval(this.cameraRoutineInterval);
    if (this.cameraRoutineEnabled) {
      this.cameraRoutineEnabled = false;
      this.spinCameraIndicator.removeClass('text-info');
      return;
    }
    this.cameraRoutineEnabled = true;
    this.cameraRoutineStep = 0;
    this.cameraRoutineInterval = setInterval(this.cameraRoutineFrame.bind(this), 1000);
    this.spinCameraIndicator.addClass('text-info');
  }
  cameraRoutineFrame() {
    const values = [-180, -180, -180, -135, -90, -135];
    this.cameraRoutineStep++;
    if (this.cameraRoutineStep >= values.length) this.cameraRoutineStep = 0;
    this.spinCamera = values[this.cameraRoutineStep];
  }

  destroy() {
    clearInterval(this.cameraRoutineInterval);
    if (this.controlpanelInterval !== undefined)
      clearInterval(this.controlpanelInterval);
    this.vehicleMqtt.unsubscribe(`sensor/${this.imei}`);
    this.vehicleMqtt.unsubscribe(`sensor/${this.imei}/monitor`);
    this.vehicleMqtt.unsubscribe(`vending/${this.imei}`);
    this.vehicleMqtt.unsubscribe(`communication/${this.imei}/robot`);

    this.monitorContainer.unsuscribeContainers();



    this.watcher.close();
    this.div.remove();

    if (this.map) {
      this.mapInstance.off();
      this.mapInstance.remove();
      this.map.remove();
      this.map = false;
    }
    delete Monitors[this.imei];
  }
  set spinCamera(v) {
    let angle = v;
    if (angle > 180) {
      angle = 180;
      this.spinCameraIndicator.addClass('limited');
      AFB.stomp.play();
    }
    if (angle < -180) {
      angle = -180;
      this.spinCameraIndicator.addClass('limited');
      AFB.stomp.play();
    }
    const snaps = [-135, -90, -45, 0, 45, 90, 135];
    for (const snapAngle of snaps) {
      if (angle < snapAngle + 3 && angle > snapAngle - 3) {
        angle = snapAngle;
        break;
      }
    }

    setTimeout(() => this.spinCameraIndicator.removeClass('limited'), 100);
    angle = Math.round(angle);
    this.spinCameraIndicator.css('transform', `rotate(${angle - 90}deg)`);
    this.sendInstruction({ command: 'MN', spin: angle });
    this._spinCamera = angle;
  }

  get spinCamera() {
    return this._spinCamera;
  }

  disconnected() {
    this.div.addClass('disconnected');
    this.connected = false;
  }
  reconnect() {
    this.div.removeClass('disconnected');
    //this.sendUrl();
    this.connected = true;
  }

  onCellphoneHeartbeat(jsonmessage) {
    const message = JSON.parse(jsonmessage);
    console.log("message", message);
    let color;
    if (message.isReaderConnected) {
      color = "green";
    }
    else {
      color = "red";
    }

  }
  close() {
    console.log('Closing!');
    if (this.allowTeleop && this.status == 5) {
      window.controlClient.controlContainer.applyBrake();

    }

    this.destroy();
  }

  lostFocus() {
    if (this.allowTeleop && this.status == 5) {
      window.controlClient.controlContainer.applyBrake();

    }
  }

  restartRobot() {
    Swal.fire({
      title: 'Brain restart',
      text: "The brain will restart, this operation may take a few minutes. Do you wish to continue?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Restart brain!'
    }).then((result) => {
      if (result.isConfirmed) {

        $.get("restart-robot", { imei: this.imei, }, function (result) {
          console.log(result);
        });
        Swal.fire('Restarting!!');

      }
    });
  }

  setVolume() {
    this.sendInstruction({
      command: 'SV',
      //vol: this.audioVolume
    });
  }

  powerOffRobot() {
    Swal.fire({
      title: 'Brain power off',
      text: "The brain will turn off, this operation may take a few minutes. Do you wish to continue?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Power off!'
    }).then((result) => {
      if (result.isConfirmed) {

        $.get("power-off-robot", { imei: this.imei, }, function (result) {
          console.log(result);
        });
        //Swal.fire('Restarting!!');

      }
    })
  }

  async changeEnvironment() {
    const inputOptions =
    {
      '127.0.0.1': 'local.tortops.com'
    };

    const { value: environ } = await Swal.fire({
      title: 'Select Domain',
      input: 'select',
      inputOptions: inputOptions,
      inputPlaceholder: 'Select a domain',
      showCancelButton: true,
      inputValidator: (value) => {
        return new Promise((resolve) => {
          resolve();
        })
      }
    })

    if (environ) {
      const ip = environ;
      const domain = inputOptions[environ];
      console.log(ip);
      console.log(domain);

      this.vehicleMqtt.publish(`connection`, JSON.stringify({
        IMEI: this.imei,
        server: 0,
        IP: ip,
        domain: domain
      }));
      Swal.fire(`Domain changed to: ${domain}`);
    }
  }

  videoStatusChanged(videoEnabled) {
    console.log('Video status changed!', videoEnabled);
    if (videoEnabled) {
      if (this.fullscreen !== undefined) {
        window.controlClient.controlContainer.updateEnableControl(true);
      }
    }
    else {
      if (this.fullscreen !== undefined) {
        window.controlClient.controlContainer.updateEnableControl(false);
      }

    }
  }

  setupARLines() {

    if (this.status == 5 && this.allowTeleop) {
      console.log('Setting up AR lines!')

      console.log("TELEOP data!!!");
      console.log(this.teleopData);
      const values = this.teleopData;

      const perspective = Number(values.perspective);
      const rotation = Number(values.x_rotation);
      const track = Number(values.track);
      const doffset = Number(values.distance_offset);
      const dscale = Number(values.distance_scale);
      const xoffset = Number(values.x_offset);
      const zrotation = Number(values.z_rotation);

      if (this.arlinesdiv)
        this.arlinesdiv.remove();

      var arDiv = $('<div>').attr('id', 'ar-supercontainer').addClass('lines-video').html(`
         <div id="ar-container">
          <div id="ar-ref">
            <div id="ar-horizon-ref">
              <div id="ar-horizon-ref-number"></div>
              <div id="ar-targetheading" class="ar-targetheading"></div>
              <div id="ar-targetheading-shadow" class="ar-targetheading"></div>
            </div>
          </div>

          <div id="ar-horizon">
            <div id="ar-horizon-15-l" class="ar-horizon-left ar-horizon-15"></div>
            <div id="ar-horizon-15-r" class="ar-horizon-right ar-horizon-15"></div>

            <div id="ar-horizon-10-l" class="ar-horizon-left ar-horizon-10"></div>
            <div id="ar-horizon-10-r" class="ar-horizon-right ar-horizon-10"></div>

            <div id="ar-horizon-5-l" class="ar-horizon-left ar-horizon-5"></div>
            <div id="ar-horizon-5-r" class="ar-horizon-right ar-horizon-5"></div>

            <div id="ar-horizon-0-l" class="ar-horizon-left ar-horizon-0"></div>
            <div id="ar-horizon-0-r" class="ar-horizon-right ar-horizon-0"></div>

            <div id="ar-horizon-n5-l" class="ar-horizon-left ar-horizon-n5"></div>
            <div id="ar-horizon-n5-r" class="ar-horizon-right ar-horizon-n5"></div>

            <div id="ar-horizon-n10-l" class="ar-horizon-left ar-horizon-n10"></div>
            <div id="ar-horizon-n10-r" class="ar-horizon-right ar-horizon-n10"></div>

            <div id="ar-horizon-n15-l" class="ar-horizon-left ar-horizon-n15"></div>
            <div id="ar-horizon-n15-r" class="ar-horizon-right ar-horizon-n15"></div>
            <div id="ar-nextstep">
              <div id="ar-nextstep-inner"></div>
            </div>
          </div>
          <div id="ar-subcontainer">
            <div id="ar-path">
              <div id="ar-center" class="ar-center"></div>

              <div id="ar-d1" class="ar-d"></div>
              <div id="ar-d2" class="ar-d"></div>
              <div id="ar-d3" class="ar-d"></div>
              <div id="ar-d4" class="ar-d"></div>

              <div id="ar-line-left" class="ar-line"></div>
              <div id="ar-line-right" class="ar-line"></div>

              <div id="ar-line-left-b" class="ar-line ar-line-chickenbox"></div>
              <div id="ar-line-right-b" class="ar-line ar-line-chickenbox"></div>

              <div id="ar-line-left-flag" class="ar-line-flag"></div>
              <div id="ar-line-right-flag" class="ar-line-flag"></div>

              <div id="ar-line-heading" class="ar-line"></div>
            </div>
          </div>
          </div>
        </div>`);

      const arpath = arDiv.find('#ar-path');

      console.log(arpath);
      //this.monitor.video.append(arDiv);

      arDiv.find('#ar-path')[0].style.transform = `perspective(${perspective}px) rotateX(${rotation}deg)  rotateZ(${zrotation}deg)`;

      arDiv.find('#ar-center')[0].style.left = `${312 + xoffset}px`;
      arDiv.find('#ar-line-left')[0].style.left = `${320 - track / 2 + xoffset}px`;
      arDiv.find('#ar-line-right')[0].style.right = `${318 - track / 2 - xoffset}px`;

      arDiv.find('#ar-d1')[0].style.left = `${308 - track / 2 + xoffset}px`;
      arDiv.find('#ar-d2')[0].style.left = `${308 - track / 2 + xoffset}px`;
      arDiv.find('#ar-d3')[0].style.left = `${308 - track / 2 + xoffset}px`;
      arDiv.find('#ar-d4')[0].style.left = `${308 - track / 2 + xoffset}px`;

      arDiv.find('#ar-d1')[0].style.width = `${track + 20}px`;
      arDiv.find('#ar-d2')[0].style.width = `${track + 20}px`;
      arDiv.find('#ar-d3')[0].style.width = `${track + 20}px`;
      arDiv.find('#ar-d4')[0].style.width = `${track + 20}px`;



      arDiv.find('#ar-d1')[0].style.bottom = `${doffset + dscale}px`;
      arDiv.find('#ar-d2')[0].style.bottom = `${doffset + dscale * 2}px`;
      arDiv.find('#ar-d3')[0].style.bottom = `${doffset + dscale * 3}px`;
      arDiv.find('#ar-d4')[0].style.bottom = `${doffset + dscale * 4}px`;

      arDiv.find('#ar-center')[0].style.height = `${doffset + dscale * 5}px`;
      arDiv.find('#ar-line-left')[0].style.height = `${doffset + dscale * 5}px`;
      arDiv.find('#ar-line-right')[0].style.height = `${doffset + dscale * 5}px`;


      if (this.activeCamera == 1) {
        console.log('Showing lines!!', this.activeCamera);
        arDiv.css("display", "inline");
      }
      else {
        console.log('Hiding lines!!', this.activeCamera);
        arDiv.css("display", "none");
        //arDiv.hide();
      }
      this.arlinesdiv = arDiv;

      const arFullscreen = $('<div>').attr('id', 'ar-fullscreen');
      if (this.fullscreen !== undefined) {

        arDiv.appendTo(arFullscreen);
        arFullscreen.appendTo(this.fullscreen);
      }
      else {
        arDiv.appendTo(this.div);
      }

      //this.div.append('<img src="/img/reflines.png">')
      //arInit();
    }


  }

}
//Dynamically from DB?
const AUDIOS_LIST =
  [

    {
      id: 110,
      short: '<i class="fad fa-list text-success"></i> Custom 1',
      text: "Custom audio 1!"
    },
    {
      id: 111,
      short: `<i class="fad fa-list text-success"></i> Custom 2`,
      text: "Custom audio 2!"
    },
    {
      id: 145,
      short: `<i class="fa fa-arrow-left text-success"></i>Refund`,
      text: "Sorry we'll be refunding your transaction"
    },
    {
      id: 146,
      short: '<i class="fa fa-hand-scissors text-success"></i>How many?',
      text: "How many items are you loading to this container?"
    },
    {
      id: 144,
      short: `<i class="fad fa-thumbs-up text-success"></i> Success`,
      text: "Success. Please open up the box to retrieve your item."
    },

    {
      id: 137,
      short: `<i class="fad fa-store text-primary"></i> I'm a smart store`,
      text: "I'm a smart store you may buy items directly from the containers"
    },
    {
      id: 138,
      short: `<i class="fad fa-wifi-2 fa-rotate-90 text-primary"></i>Payment methods`,
      text: "Hi, you can use apple pay, google pay or tap to pay credit card"
    },
    {
      id: 134,
      short: '<i class="fad fa-empty-set text-primary"></i> Out of stock',
      text: "I'm sorry, this box is out of stock. Please try again in a couple of hours."
    },
    {
      id: 132,
      short: `<i class="fa fa-thumbs-down text-danger"></i>Transaction failed`,
      text: "I am sorry, this transaction has failed. Please try again with a different payment method"
    },
    {
      id: 113,
      short: '<i class="fad fa-mask text-danger"></i> More than one',
      text: "Ysou only paid for one but it looks like you took more than one."
    },
    {
      id: 109,
      short: `<i class="fad fa-siren-on text-danger"></i> Alarm`,
      text: "Obnoxious alarm"
    },

    {
      id: 136,
      short: `<i class="fad fa-trumpet text-warning"></i> Beep!`,
      text: "Beep!"
    },

  ];


window.Monitors = Monitors;
