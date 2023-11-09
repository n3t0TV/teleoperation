
const ControlProfiles = {};
// Xbox Controller
ControlProfiles.Xbox = {
  matchId: "XInput STANDARD GAMEPAD",
  buttons:
  {
    // RIGHT THUMB
    0: {
      button: 'greenA'
    }, //A
    1: {
      button: 'redB'
    }, //B
    2: {
      button: 'blueX'
    }, //X
    3: {
      button: 'yellowY'
    }, //Y
    // INDEX FINGERS
    4: {
      button: 'shiftDown'
    }, // LB
    5: {
      button: 'shiftUp'
    }, // RB
    // TRIGGERS
    6: { axis: 'record' }, // LT
    7: { axis: 'accel' }, // RT
    // BUTTON
    8: {
      button: 'select'
    }, // Back / View
    9: {
      button: 'start'
    }, // Start
    // STICK SWICHES
    10: { button: 'steerReset' }, // LS
    11: { button: 'RS' }, // RS yawOffset
    // HAT
    12: {
      button: 'crossUp',
      blinkers: { button: 'videoModeUp' },
      movcam: { button: 'camup' },
      audioSelector: { button: 'audioUp' },
      teleopmenu: { button: 'teleopmenuUp' }
    }, // HAT-UP
    13: {
      button: 'crossDown',
      blinkers: { button: 'videoModeDown' },
      movcam: { button: 'camdown' },
      audioSelector: { button: 'audioDown' },
      teleopmenu: { button: 'teleopmenuDown' }
    }, // HAT-DOWN
    14: {
      button: 'crossLeft',
      blinkers: { button: 'turnSignalLeft' },
      movcam: { button: 'camleft' },
      audioSelector: { button: 'audioLeft' },
      teleopmenu: { button: 'teleopmenuLeft' }
    },// HAT-LEFT
    15: {
      button: 'crossRight',
      blinkers: { button: 'turnSignalRight' },
      movcam: { button: 'camright' },
      audioSelector: { button: 'audioRight' },
      teleopmenu: { button: 'teleopmenuRight' }
    } // HAT-RIGHT
  },
  axes: {
    // LEFT STICK
    0: {
      axis: 'steer'

      //    atan: true,
      //type: 'joystick'
    }, // LX
    1: { axis: 'LY' }, // LY
    // RIGHT STICK
    2: {
      axis: 'RX'

      //  atan: true,
    //  menu: { axis: 'menuX' }
    }, // LX
    3: {
      axis: 'RY'
    //  menu: { axis: 'menuY' }
    } // LY
  }
};
