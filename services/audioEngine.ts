class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmInterval: number | null = null;
  private isPlayingBgm: boolean = false;
  private currentDefcon: number = 5;

  constructor() {
    // Initialized on user interaction
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.4; // Master Volume
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error("Audio resume failed", e));
    }
  }

  setDefcon(level: number) {
    this.currentDefcon = level;
    if (this.isPlayingBgm) {
      this.stopBgm();
      this.startBgm();
    }
  }

  startBgm() {
    this.init(); // Ensure init
    if (!this.ctx || this.bgmInterval) return;
    this.isPlayingBgm = true;

    // Tempo based on DEFCON: Lower defcon = faster bpm
    // 5: 60bpm, 1: 140bpm
    const bpm = 60 + (5 - this.currentDefcon) * 20;
    const intervalMs = (60 / bpm) * 1000;
    
    let beat = 0;

    this.bgmInterval = window.setInterval(() => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      
      // Bass Pulse (Heartbeat)
      this.playTone(50 + (5-this.currentDefcon)*10, 'sine', 0.1, 0, 0.4);

      // High Tension Ping (Sonar/Radar)
      if (beat % 4 === 0) {
        const pitch = this.currentDefcon === 1 ? 880 : 440;
        this.playTone(pitch, 'sine', 0.05, 0, 0.1);
      }

      // Snare/Click (Mechanical)
      if (beat % 2 !== 0) {
         this.playNoise(0.05, 0.1);
      }

      // Arpeggio for urgency (DEFCON 1-2)
      if (this.currentDefcon <= 2) {
         if (beat % 2 === 0) {
            this.playTone(200, 'square', 0.05, 0.25, 0.05);
            this.playTone(300, 'square', 0.05, 0.5, 0.05);
         }
      }

      beat++;
    }, intervalMs);
  }

  stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.isPlayingBgm = false;
  }

  toggleAudio(enabled: boolean) {
    this.init();
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(enabled ? 0.4 : 0, this.ctx?.currentTime || 0, 0.1);
    }
  }

  // Helper to create an oscillator
  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, vol: number = 1) {
    // Attempt init if trying to play sound
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;
    
    try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(vol, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    } catch(e) {
        console.warn("Audio playTone failed", e);
    }
  }

  private playNoise(duration: number, vol: number = 1) {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;

    try {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        noise.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
    } catch(e) {
        console.warn("Audio playNoise failed", e);
    }
  }

  // --- Sound Effects ---

  playClick() {
    this.playNoise(0.05, 0.2);
    this.playTone(800, 'square', 0.05, 0, 0.1);
  }

  playCardSlide() {
    this.playNoise(0.15, 0.3);
  }

  playStamp() {
    this.playTone(100, 'sawtooth', 0.1, 0, 0.6);
    this.playNoise(0.2, 0.5);
  }

  playAttack() {
    // Explosion/Gunshot sound
    this.playNoise(0.3, 0.6);
    this.playTone(50, 'sawtooth', 0.4, 0, 0.5);
  }

  playAlarm() {
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    for(let i=0; i<3; i++) {
      this.playTone(880, 'square', 0.3, i * 0.6, 0.4);
      this.playTone(440, 'sawtooth', 0.3, i * 0.6 + 0.3, 0.4);
    }
  }

  playRadioStart() {
    this.playNoise(0.5, 0.2);
    this.playTone(1200, 'sine', 0.1, 0.1, 0.2);
  }

  playSiren() {
    if (!this.ctx) this.init();
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1000, this.ctx.currentTime + 2);
    
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 3);
  }
}

export const audioEngine = new AudioEngine();