// Web Audio API based ambient sound synthesizer for reading focus
let audioCtx: AudioContext | null = null;
let currentGainNode: GainNode | null = null;
let noiseNode: AudioNode | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export type SoundType = 'off' | 'rain' | 'waves' | 'forest' | 'fireplace';

export function playAmbientSound(type: SoundType, volume: number = 0.3) {
  stopAmbientSound();
  if (type === 'off') return;

  try {
    const ctx = getAudioContext();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    // Pink / Brown noise generation for realistic ambient background
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === 'rain') {
        output[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      } else if (type === 'waves') {
        output[i] = (lastOut + 0.01 * white) / 1.01;
        lastOut = output[i];
        output[i] *= 4.0;
      } else if (type === 'fireplace') {
        output[i] = Math.random() > 0.995 ? Math.random() * 0.8 : (lastOut + 0.03 * white) / 1.03;
        lastOut = output[i];
      } else {
        // Forest / Wind
        output[i] = (lastOut + 0.015 * white) / 1.015;
        lastOut = output[i];
        output[i] *= 2.5;
      }
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = buffer;
    whiteNoise.loop = true;

    // Filter for smooth relaxing tone
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(type === 'rain' ? 800 : type === 'waves' ? 400 : 600, ctx.currentTime);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    whiteNoise.start();
    noiseNode = whiteNoise;
    currentGainNode = gainNode;
  } catch (err) {
    console.warn('Ambient audio could not start:', err);
  }
}

export function stopAmbientSound() {
  if (noiseNode) {
    try {
      (noiseNode as any).stop();
      noiseNode.disconnect();
    } catch (_) {}
    noiseNode = null;
  }
}
