import Phaser from 'phaser';
import { createAudioGate, type AudioGate } from './audioGate';

/** Audio keys and files loaded by BootScene. All of them are synthesised by tools/gen-audio.mjs. */
export const AUDIO = {
  ambient: 'assets/audio/ambient.wav',
  step: 'assets/audio/step.wav',
  door: 'assets/audio/door.wav',
  blip: 'assets/audio/blip.wav',
} as const;
export type AudioKey = keyof typeof AUDIO;

const GATE_KEY = 'audioGate';
const MUTED_KEY = 'muted';
const AMBIENT_VOLUME = 0.35;

/**
 * The game-wide audio gate (shared by every scene through the registry). Unlocking it starts the
 * ambient loop; if the loop cannot start (file failed to load, no audio device), the gate stays
 * locked and the game carries on silently.
 */
export function audioGate(game: Phaser.Game): AudioGate {
  let gate = game.registry.get(GATE_KEY) as AudioGate | undefined;
  if (!gate) {
    gate = createAudioGate(() => {
      if (!game.cache.audio.exists('ambient')) throw new Error('ambient loop is not loaded');
      const music = game.sound.get('ambient') ?? game.sound.add('ambient', { loop: true, volume: AMBIENT_VOLUME });
      if (!music.isPlaying) music.play();
    });
    game.registry.set(GATE_KEY, gate);
  }
  return gate;
}

/** Plays a short effect once audio is unlocked. Never throws: sound is decoration, not gameplay. */
export function playSfx(game: Phaser.Game, key: Exclude<AudioKey, 'ambient'>, config: Phaser.Types.Sound.SoundConfig = {}): void {
  try {
    if (!audioGate(game).isUnlocked() || isMuted(game) || !game.cache.audio.exists(key)) return;
    game.sound.play(key, config);
  } catch (err) {
    console.warn(`Could not play ${key}:`, err);
  }
}

/**
 * Whether the visitor muted the game. Kept in the registry because the Web Audio manager's `mute`
 * getter reads a gain node that only updates asynchronously, so it lags right after a change.
 */
export function isMuted(game: Phaser.Game): boolean {
  return game.registry.get(MUTED_KEY) === true;
}

/** Toggles the global mute; works whether or not audio has been unlocked. Returns the new state. */
export function toggleMute(game: Phaser.Game): boolean {
  const muted = !isMuted(game);
  game.registry.set(MUTED_KEY, muted);
  try {
    game.sound.mute = muted;
  } catch (err) {
    console.warn('Could not toggle mute:', err);
  }
  return muted;
}
