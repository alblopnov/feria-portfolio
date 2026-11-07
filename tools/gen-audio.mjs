// Synthesises the game's audio as 16-bit mono PCM WAV files, with no dependencies.
// Run: node tools/gen-audio.mjs
//   ambient.wav  20 s seamless loop: plucked-guitar arpeggios over the Andalusian cadence
//                (Am - G - F - E, the Phrygian flavour of flamenco), soft palmas and a crowd-murmur bed
//   step.wav     a soft footstep on sand
//   door.wav     a wooden knock and a small two-note chime
//   blip.wav     the dialogue typewriter tick
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SR = 22050;

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

/** Adds a plucked string (additive harmonics; upper ones die away faster, like nylon strings). */
function pluck(buf, start, freq, amp, decay = 1.6) {
  const len = Math.min(buf.length - start, Math.floor(SR * decay * 2.2));
  const pos = 0.18; // pluck position along the string shapes the harmonic mix
  const harmonics = [];
  for (let k = 1; k <= 10 && freq * k < SR / 2.2; k++) {
    harmonics.push({ w: (2 * Math.PI * freq * k) / SR, a: Math.abs(Math.sin(Math.PI * k * pos)) / k ** 1.1, d: (1 + 0.55 * (k - 1)) / decay });
  }
  const norm = harmonics.reduce((s, h) => s + h.a, 0);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const attack = Math.min(1, i / (SR * 0.004));
    let v = 0;
    for (const h of harmonics) v += h.a * Math.exp(-h.d * 3 * t) * Math.sin(h.w * i);
    buf[start + i] += (amp * attack * v) / norm;
  }
}

/** One-pole low-pass filter in place. */
function lowpass(buf, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < buf.length; i++) buf[i] = y += a * (buf[i] - y);
  return buf;
}

function noise(len, seed) {
  const r = rng(seed);
  return Float64Array.from({ length: len }, () => r() * 2 - 1);
}

/** A hand clap: band-limited noise with a sharp decay. */
function palma(buf, start, amp, r) {
  const len = Math.floor(SR * 0.06);
  let lp = 0;
  let prev = 0;
  for (let i = 0; i < len && start + i < buf.length; i++) {
    const n = r() * 2 - 1;
    lp += 0.5 * (n - lp);
    const hp = lp - prev; // crude band-pass around 1-3 kHz
    prev = lp;
    buf[start + i] += amp * hp * Math.exp(-i / (SR * 0.012));
  }
}

function ambient() {
  const BAR = 2.5;
  const chords = [
    { bass: 45, arp: [52, 57, 60, 64, 60, 57] }, // Am
    { bass: 43, arp: [50, 55, 59, 62, 59, 55] }, // G
    { bass: 41, arp: [48, 53, 57, 60, 57, 53] }, // F
    { bass: 40, arp: [47, 52, 56, 59, 56, 52] }, // E (major: the flamenco cadence home)
  ];
  const bars = 8;
  const N = Math.round(BAR * bars * SR);
  const TAIL = 4 * SR;
  const out = new Float64Array(N + TAIL);
  const r = rng(7);

  for (let b = 0; b < bars; b++) {
    const chord = chords[b % 4];
    const t0 = b * BAR;
    pluck(out, Math.round(t0 * SR), midi(chord.bass), 0.5, 2.4);
    // Second pass climbs higher on the turnaround for a little variation.
    const arp = b >= 4 ? [...chord.arp.slice(0, 3), chord.arp[3] + (b === 7 ? 5 : 3), chord.arp[3], chord.arp[2]] : chord.arp;
    arp.forEach((note, i) => {
      const jitter = (r() - 0.5) * 0.02;
      pluck(out, Math.round((t0 + 0.05 + (i * BAR) / 6 + jitter) * SR), midi(note), 0.28 + r() * 0.06, 1.4);
    });
    // Quiet palmas on the 3rd and 5th pulses of the second half.
    if (b >= 4) for (const p of [2, 4]) palma(out, Math.round((t0 + 0.05 + (p * BAR) / 6) * SR), 0.18, r);
  }
  // Fold the ringing tail back onto the start so the loop has no seam.
  for (let i = 0; i < TAIL; i++) out[i] += out[N + i];

  // Crowd murmur: low-passed noise, gently swelling with modulations whose periods divide the loop.
  const FADE = SR;
  const murmur = lowpass(lowpass(noise(N + FADE, 99), 500), 700);
  const loopHz = 1 / (BAR * bars);
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const swell = 0.75 + 0.15 * Math.sin(2 * Math.PI * 2 * loopHz * t) + 0.1 * Math.sin(2 * Math.PI * 7 * loopHz * t + 1);
    let m = murmur[i];
    if (i < FADE) m = m * (i / FADE) + murmur[N + i] * (1 - i / FADE);
    result[i] = out[i] + 0.55 * swell * m;
  }
  return normalise(result, 0.55);
}

function step() {
  const len = Math.floor(SR * 0.08);
  const n = lowpass(noise(len, 3), 900);
  return normalise(
    n.map((v, i) => v * Math.exp(-i / (SR * 0.014)) + 0.4 * Math.sin((2 * Math.PI * 95 * i) / SR) * Math.exp(-i / (SR * 0.018))),
    0.6,
  );
}

function door() {
  const len = Math.floor(SR * 0.6);
  const out = new Float64Array(len);
  const n = lowpass(noise(len, 5), 1200);
  for (const at of [0, 0.1]) {
    const s = Math.round(at * SR);
    for (let i = 0; i < SR * 0.07 && s + i < len; i++) {
      const env = Math.exp(-i / (SR * 0.012));
      out[s + i] += env * (n[s + i] + 0.8 * Math.sin((2 * Math.PI * 170 * i) / SR));
    }
  }
  for (const [at, note] of [[0.2, 76], [0.3, 83]]) {
    const s = Math.round(at * SR);
    for (let i = 0; s + i < len; i++) out[s + i] += 0.35 * Math.sin((2 * Math.PI * midi(note) * i) / SR) * Math.exp(-i / (SR * 0.09));
  }
  return normalise(out, 0.55);
}

function blip() {
  const len = Math.floor(SR * 0.04);
  const w = (2 * Math.PI * 1046) / SR;
  return normalise(
    Float64Array.from({ length: len }, (_, i) => (Math.sin(w * i) + 0.3 * Math.sin(3 * w * i)) * Math.exp(-i / (SR * 0.01))),
    0.35,
  );
}

function normalise(buf, peak) {
  const max = buf.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  return buf.map((v) => (v / max) * peak);
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function save(name, samples) {
  const file = join(root, 'public/assets/audio', name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, wav(samples));
  console.log('wrote', `public/assets/audio/${name}`, `${(samples.length / SR).toFixed(2)} s`);
}

save('ambient.wav', ambient());
save('step.wav', step());
save('door.wav', door());
save('blip.wav', blip());
