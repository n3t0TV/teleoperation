/* global process */
class Performance {
  constructor() {
    this.tics = {};
    this.tics['APP_START'] = process.hrtime();
  }

  tic(name) {
    this.tics[name] = process.hrtime();
  }

  toc(name = 'APP_START') {
    const current = process.hrtime();
    const currentms = current[0] * 1000 + current[1] / 1000000;
    const ticTime = this.tics[name];
    const ticTimems = ticTime[0] * 1000 + ticTime[1] / 1000000;
    return currentms - ticTimems;
  }
}

const performance = new Performance();

module.exports = performance;