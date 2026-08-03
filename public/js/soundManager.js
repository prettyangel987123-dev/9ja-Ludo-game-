// Sound Manager
class SoundManager {
    constructor() {
        this.sounds = {
            diceRoll: document.getElementById('diceRollSound'),
            move: document.getElementById('moveSound'),
            capture: document.getElementById('captureSound'),
            home: document.getElementById('homeSound'),
            victory: document.getElementById('victorySound'),
            defeat: document.getElementById('defeatSound'),
            warning: document.getElementById('warningSound')
        };
        this.enabled = true;
        this.volume = 0.7;
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        const sound = this.sounds[soundName];
        sound.volume = this.volume;
        sound.currentTime = 0;
        sound.play().catch(err => console.warn('Sound play failed:', err));
    }

    setVolume(level) {
        this.volume = Math.max(0, Math.min(1, level));
        Object.values(this.sounds).forEach(sound => {
            sound.volume = this.volume;
        });
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    stop(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].pause();
            this.sounds[soundName].currentTime = 0;
        }
    }
}

const soundManager = new SoundManager();
window.soundManager = soundManager;
