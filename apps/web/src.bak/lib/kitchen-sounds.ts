/**
 * Kitchen notification sounds using Web Audio API.
 * No external files needed — generates tones programmatically.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a simple tone
 */
function playTone(frequency: number, duration: number, volume = 0.3, type: OscillatorType = 'sine') {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

/**
 * New order alert — two ascending tones (ding-dong)
 */
export function playNewOrderSound() {
  playTone(880, 0.15, 0.4, 'sine');   // A5
  setTimeout(() => {
    playTone(1175, 0.25, 0.4, 'sine'); // D6
  }, 160);
}

/**
 * Urgent order alert — rapid triple beep
 */
export function playUrgentSound() {
  playTone(1000, 0.1, 0.5, 'square');
  setTimeout(() => playTone(1000, 0.1, 0.5, 'square'), 150);
  setTimeout(() => playTone(1000, 0.1, 0.5, 'square'), 300);
}

/**
 * Order ready / bumped — soft chime
 */
export function playReadySound() {
  playTone(1320, 0.12, 0.25, 'sine');  // E6
  setTimeout(() => playTone(1568, 0.2, 0.25, 'sine'), 130); // G6
}

/**
 * Item completed — single soft ding
 */
export function playCompleteSound() {
  playTone(1568, 0.3, 0.2, 'sine'); // G6
}

/**
 * Initialize audio context with a user interaction (required by browsers).
 * Call this on any click/touch in the kitchen page.
 */
export function initAudio() {
  try {
    getAudioContext();
  } catch (e) {
    // Silently fail if Web Audio not supported
  }
}
