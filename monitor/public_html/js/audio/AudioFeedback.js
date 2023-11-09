export let enableAudioFeedBack = true;
class AudioFeedback {
    constructor(cat, id) {
        this.id = id;
        this.url = `sound/${cat}/${id}.mp3`;
        this.audio = new Audio(this.url);
        this.ready = new Promise(resolve => { this.audio.oncanplay = resolve; });
    }
    async play() {
        if (!enableAudioFeedBack) return;
        try {
            await this.ready;
            this.audio.currentTime = 0;
            this.audio.play();
        } catch (err) {
            console.warn(`Can't play ${this.id}`, err);
        }
    }
    async stop() {
        try {
            await this.ready;
            this.audio.pause();
            this.audio.currentTime = 0;
        } catch (err) {
            console.warn(`Can't stop ${this.id}`, err);
        }
    }
}

export const AFB = {};

export function stopAll() {
    for (let id in AFB) {
        const afb = AFB[id];
        try {
            audio.stop();
        } catch (e) {
            console.warn(e);
        }
    }
}


function addAudio(cat, id) {
    const afb = new AudioFeedback(cat, id);
    AFB[id] = afb;
}

const SFXs = ['kaching', 'stomp', 'wrong', 'stomp2','recharge'];
for (const sfx of SFXs) {
    addAudio('SFX', sfx);
}