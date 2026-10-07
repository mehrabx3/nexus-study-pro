// Web Audio API Synthesizer - 100% Client-Side & Zero-Dependency Audio Engine

class AudioEngine {
  private ctx: AudioContext | null = null;
  private ambientSourceNodes: {
    gainNode: GainNode;
    sources: (AudioNode | AudioBufferSourceNode | OscillatorNode)[];
  } | null = null;
  private currentAmbientType: 'binaural' | 'rain' | 'space' | 'river' | null = null;
  private currentVolume = 0.35;
  private isSoundEnabled = true;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with autoplay policy
    const savedSound = localStorage.getItem('nexus_sound_enabled');
    if (savedSound !== null) {
      this.isSoundEnabled = savedSound === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean) {
    this.isSoundEnabled = enabled;
    localStorage.setItem('nexus_sound_enabled', enabled.toString());
    if (!enabled && this.ambientSourceNodes) {
      this.stopAmbient();
    }
  }

  public getSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  // --- HAPTIC & UI TACTILE AUDIO ---
  public playHaptic(type: 'click' | 'pop' | 'success' | 'levelUp' | 'bell' = 'click') {
    if (!this.isSoundEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      if (type === 'click') {
        // Crisp Apple-like click (subtle 800Hz micro-tap)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.025);
      } else if (type === 'pop') {
        // Soft bubble pop for toggles/checks
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.04);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.045);
      } else if (type === 'success') {
        // Two-tone Apple Reminders success chime (E5 -> B5)
        const notes = [659.25, 987.77];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.08;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0, noteTime);
          gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.28);
        });
      } else if (type === 'levelUp') {
        // 4-chord ascending celebration
        const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        chords.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const noteTime = now + idx * 0.07;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, noteTime);

          gain.gain.setValueAtTime(0, noteTime);
          gain.gain.linearRampToValueAtTime(0.18, noteTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.45);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(noteTime);
          osc.stop(noteTime + 0.45);
        });
      } else if (type === 'bell') {
        // Meditation Tibetan bowl style bell for timer completion
        const baseFreq = 528; // 528Hz Solfeggio frequency
        const harmonics = [1, 2.02, 3.01];
        harmonics.forEach((h, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * h, now);

          const amp = 0.2 / (idx + 1);
          gain.gain.setValueAtTime(amp, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 2.5);
        });
      }
    } catch (e) {
      // Ignore background audio interruptions
    }
  }

  // --- AMBIENT FOCUS GENERATOR ---
  private createNoiseBuffer(ctx: AudioContext, type: 'white' | 'brown' | 'pink'): AudioBuffer {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'brown') {
        // Brown noise (warm, deep rumble)
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      } else if (type === 'pink') {
        // Pink noise (natural rain-like balance)
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      } else {
        data[i] = white * 0.3;
      }
    }
    return buffer;
  }

  public startAmbient(type: 'binaural' | 'rain' | 'space' | 'river', volume = 0.35) {
    if (!this.isSoundEnabled) return;
    this.stopAmbient();

    const ctx = this.getContext();
    if (!ctx) return;

    this.currentAmbientType = type;
    this.currentVolume = volume;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 1.2);
    masterGain.connect(ctx.destination);

    const sources: (AudioNode | AudioBufferSourceNode | OscillatorNode)[] = [];

    if (type === 'binaural') {
      // 40Hz Gamma Focus Frequency (196Hz Base carrier + 236Hz)
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.type = 'sine';
      oscR.type = 'sine';
      oscL.frequency.setValueAtTime(200, ctx.currentTime);
      oscR.frequency.setValueAtTime(240, ctx.currentTime); // 40Hz difference

      const merger = ctx.createChannelMerger(2);
      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);

      merger.connect(masterGain);
      oscL.start();
      oscR.start();
      sources.push(oscL, oscR, merger);
    } else if (type === 'rain') {
      // Organic pink noise + low-pass filter
      const noiseBuffer = this.createNoiseBuffer(ctx, 'pink');
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();
      sources.push(noiseSource, filter);
    } else if (type === 'space') {
      // Deep Brown Noise + resonance filter for cosmic space drone
      const noiseBuffer = this.createNoiseBuffer(ctx, 'brown');
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, ctx.currentTime);

      // Low sub sine layer
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(65.41, ctx.currentTime); // C2

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.4, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(masterGain);
      sub.connect(subGain);
      subGain.connect(masterGain);

      noiseSource.start();
      sub.start();
      sources.push(noiseSource, filter, sub, subGain);
    } else if (type === 'river') {
      // Fluid white noise modulated with gentle bandpass
      const noiseBuffer = this.createNoiseBuffer(ctx, 'pink');
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.Q.setValueAtTime(1.5, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(masterGain);
      noiseSource.start();
      sources.push(noiseSource, filter);
    }

    this.ambientSourceNodes = {
      gainNode: masterGain,
      sources
    };
  }

  public stopAmbient() {
    if (!this.ambientSourceNodes || !this.ctx) return;
    const { gainNode, sources } = this.ambientSourceNodes;
    try {
      const now = this.ctx.currentTime;
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.5);
      setTimeout(() => {
        sources.forEach((node) => {
          if ('stop' in node && typeof (node as any).stop === 'function') {
            try {
              (node as any).stop();
            } catch (e) {}
          }
          try {
            node.disconnect();
          } catch (e) {}
        });
      }, 550);
    } catch (e) {
      // cleanup error ignored
    }
    this.ambientSourceNodes = null;
    this.currentAmbientType = null;
  }

  public setAmbientVolume(vol: number) {
    this.currentVolume = Math.max(0, Math.min(1, vol));
    if (this.ambientSourceNodes && this.ctx) {
      this.ambientSourceNodes.gainNode.gain.setValueAtTime(this.currentVolume, this.ctx.currentTime);
    }
  }

  public getCurrentAmbientType(): 'binaural' | 'rain' | 'space' | 'river' | null {
    return this.ambientSourceNodes ? this.currentAmbientType : null;
  }

  public isAmbientActive(): boolean {
    return this.ambientSourceNodes !== null;
  }
}

export const audioEngine = new AudioEngine();
