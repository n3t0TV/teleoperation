
class ControlMapper {
    constructor(controller, device, profile) {
        this.controller = controller;
        this.device = device;
        this.profile = profile;
        this.modifiers = [];
        this.locked = {};
    }

    get polling() {
        return this._polling;
    }
    destroy() {
        this.stopPolling();
    }
    stopPolling() {
        clearInterval(this.pollInterval);
        this._polling = false;
    }

    hasModifier(modifier) {
        return this.modifiers.indexOf(modifier) !== -1;
    }

    addModifier(modifier) {
        if (!this.hasModifier(modifier)) {
            this.modifiers.push(modifier);
        }
        return this.modifiers;
    }

    removeModifier(modifier) {
        const index = this.modifiers.indexOf(modifier);
        if (index > -1) {
            this.modifiers.splice(index, 1);
        }
        return this.modifiers;
    }

    startPolling(period) {
        this.pollInterval = setInterval(this.poll.bind(this), period);
        this._polling = true;
    }

    poll() {
        const c = this.controller;
        const p = this.profile;
        let d;
        if (this.device.index === 'virtual') {
            d = this.device;
        } else {
            d = navigator.getGamepads()[this.device.index];
        }


        for (let b in p.buttons) {
            const pb = p.buttons[b];

            let assignation = pb;
            let activeMod = false;
            for (const mod of this.modifiers) {
                if (pb[mod]) {
                    assignation = pb[mod];
                    activeMod = mod;
                    break;
                }
            }
            if (!d.buttons[Number(b)]) {
                console.log('There is not button' + b);
                continue;
            }
            const value = d.buttons[Number(b)].value;




            for (const mod of Object.keys(pb)) {
                switch (mod) {
                    case 'button':
                        if (!value) {
                            this.locked[pb.button] = false;
                        } else {
                            this.locked[pb.button] = !!activeMod || this.locked[pb.button];
                        }
                    case 'axis':
                        if (!value) {
                            this.locked[pb.axis] = false;
                        } else {
                            this.locked[pb.axis] = !!activeMod || this.locked[pb.axis];
                        }
                        break;
                    case 'deadzone':
                    case 'atan':
                        break;
                    default:
                        const unassignation = pb[mod];
                        if (unassignation.button) {
                            if (!value) {
                                this.locked[unassignation.button] = false;
                            } else {
                                this.locked[unassignation.button] = (mod !== activeMod) || this.locked[unassignation.button];
                            }
                        }
                        if (unassignation.axis) {
                            if (!value) {
                                this.locked[unassignation.axis] = false;
                            } else {
                                this.locked[unassignation.axis] = (mod !== activeMod) || this.locked[unassignation.axis];
                            }
                        }
                        break;
                }
            }



            if ((assignation.button && this.locked[assignation.button]) || (assignation.axis && this.locked[assignation.axis])) {
                continue;
            }
            if (this.controller.buttons[assignation.button]) {
                this.controller.buttons[assignation.button].status = value;
            }
            if (this.controller.axes[assignation.axis]) {
                this.controller.axes[assignation.axis].value = value;
            }
        }

        for (let a in p.axes) {
            const pa = p.axes[a];
            let assignation = pa;
            for (const mod of this.modifiers) {
                if (pa[mod]) {
                    assignation = pa[mod];
                    break;
                }
            }
            let value = d.axes[Number(a)];
            if (assignation.deadzone) {
                const dz = assignation.deadzone;
                const sign = Math.sign(value);
                const max = 1 - dz;
                if (Math.abs(value) < dz) {
                    value = 0;
                } else {
                    value = (value - (sign * dz)) / max;
                }
            }

            if (assignation.offset) {
                value += assignation.offset;
            }

            if (assignation.scale) {
                value /= assignation.scale;
            }

            if (assignation.inverted) {
                value = 1 - value;
            }


            if (assignation.max) {
                value /= assignation.max;
                if (value > 1) {
                    value = 1;
                } else if (value < -1) {
                    value = -1;
                }
            }

            //          console.log(assignation.atan,value);
            if (assignation.atan) {
                value = Math.atan(value) * 4 / Math.PI;
            }
            //            console.log(assignation.atan,value);

            if (this.controller.buttons[assignation.button]) {
                this.controller.buttons[assignation.button].status = value;
            }
            if (this.controller.axes[assignation.axis]) {
                this.controller.axes[assignation.axis].type = assignation.type;
                this.controller.axes[assignation.axis].value = value;
            }

            if (assignation.buttons) {
                for (let level in assignation.buttons) {

                    if (!this.controller.buttons[assignation.buttons[level]]) {
                        continue;
                    }
                    const assignedButton = this.controller.buttons[assignation.buttons[level]];

                    if (Number(level) === Math.floor(value * 1000) || level == value) {
                        assignedButton.status = 1;
                    } else {
                        assignedButton.status = 0;
                    }
                }
            }

        }

      /*  if ( dev.log.gamepad) {
            const axesValues = {};
            for (let axis in this.controller.axes) {
                axesValues[axis] = this.controller.axes[axis].value;
            }
            console.log(axesValues);
            const buttonValues = {};
            for (let button in this.controller.buttons) {
                buttonValues[button] = this.controller.buttons[button].status;
            }
            console.log(buttonValues);
        }*/
    }
    rumble(duration, weak, strong) {
        const haptic = this.device.vibrationActuator;
        if (!haptic) {
            return false;
        }
        if (haptic.pulse) {
            try {
                haptic(weak, duration);
                return true;
            } catch (e) {
                console.log(e);
            }
        }
        if (haptic.playEffect) {
            try {
                haptic.playEffect("dual-rumble", {
                    startDelay: 0,
                    duration: duration,
                    weakMagnitude: weak,
                    strongMagnitude: strong
                });
                return true;
            } catch (e) {
                console.log(e);
            }

        }
        if (haptic.vibrate) {
            haptic.vibrate(duration);
        }

        return false;
    }
}



/*
* Clases de control utilizadas en la app de tortoise
*/

class Controller {
    constructor() {
        this.axes = {};
        this.buttons = {};
        this.callbacks = {};
    }
    destroy() {
        for (let a in this.axes) {
            const axis = this.axes[a];
            axis.destroy();
        }
        this.axes = {};
        for (let b in this.buttons) {
            const button = this.buttons[b];
            button.destroy();
        }
        this.buttons = {};
        this.callbacks = {};
    }
    addButton(button, name) {
        const pos = Object.keys(this.buttons).length;
        const btnname = name || 'button' + pos;
        this.buttons[btnname] = button;
        button.on('change', (val) => {
            this.callback('button-' + btnname + '-change', val);
        });
        button.on('down', () => {
            this.callback('button-' + btnname + '-down');
        });
        button.on('up', () => {
            this.callback('button-' + btnname + '-up');
        });
    }
    addAxis(axis, name) {
        const pos = Object.keys(this.axes).length;
        const axisname = name || 'axis' + pos;
        this.axes[axisname] = axis;
        axis.on('change', (val) => {
            this.callback('axis-' + axisname + '-change', val);
        });
        axis.on('limit', () => {
            this.callback('axis-' + axisname + '-limit');
        });
        axis.on('limitHi', () => {
            this.callback('axis-' + axisname + '-limitHi');
        });
        axis.on('limitLo', () => {
            this.callback('axis-' + axisname + '-limitLo');
        });
    }
    on(event, callback) {
        this.callbacks[event] = callback;
    }
    callback(event, ...args) {
        if (this.callbacks[event]) {
            this.callbacks[event](...args);
        }
    }
}

class Button {
    constructor() {
        this.callbacks = {};
    }
    destroy() {
        this.callbacks = [];
    }
    set status(val) {
        const changed = (!!val !== this._status);
        this._status = !!val;
        if (this.callbacks.change && changed) {
            this.callbacks.change(val);
        }
        if (this.callbacks.down && this._status && changed) {
            this.callbacks.down();
        }
        if (this.callbacks.up && !this._status && changed) {
            this.callbacks.up();
        }
    }
    get status() {
        return this._status;
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }
}

class Axis {
    constructor(min, max) {
        this.callbacks = {};
        this.min = min;
        this.max = max;
        this.offLimits = false;
        this._value = 0;
    }
    destroy() {
        this.callbacks = [];
    }
    set value(val) {
        val = Number(val);
        if (isNaN(val)) {
            val = 0;
        }
        const changed = (val !== this._value);
        this._value = val;
        this.offLimits = false;
        if (this._value <= this.min) {
            this._value = this.min;
            this.offLimits = true;
            if (this.callbacks.limitLo) {
                this.callbacks.limitLo(val);
            }
            if (this.callbacks.limit) {
                this.callbacks.limit(val);
            }
        }
        if (this._value >= this.max) {
            this._value = this.max;
            this.offLimits = true;
            if (this.callbacks.limitHi) {
                this.callbacks.limitHi(val);
            }
            if (this.callbacks.limit) {
                this.callbacks.limit(val);
            }
        }

        if (this.callbacks.change && changed) {
            this.callbacks.change(this._value);
        }
    }
    get value() {
        return this._value;
    }

    feedback(...args) {
        this.feedbackResponse(...args);
        if (this.callbacks.feedback) {
            this.callbacks.feedback(...args);
        }
    }
    feedbackResponse(...args) {
        console.log('feedback', args);
        return false;
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }
}
