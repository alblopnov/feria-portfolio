# Credits

Every asset in this game is original. Nothing was downloaded, traced or adapted from third-party art or
sound packs: all pixel art, maps and audio are generated in code by the Node scripts in [`tools/`](tools/),
using only Node's built-in modules. There are no third-party assets, so there are no asset licenses to
honour.

## Art

| File | What it is | Made by |
| --- | --- | --- |
| `public/assets/tilesets/feria.png` | Base tileset: albero ground, cobbles, fences, walls, azulejos, furniture, the About house, the portada gate | `tools/gen-assets.mjs` |
| `public/assets/tilesets/feria-custom.png` | Feria pieces: the Caseta-musica facade (striped lona, scalloped valance, farolillos, lit "CASETA" sign), the under-construction caseta, cones and works signs, overhead bunting and garlands, the Credits sign, the mute icons | `tools/gen-assets.mjs` |
| `public/assets/tilesets/feria-projects.png` | CV project casetas and rooms: the Secure Voting town hall, the Action Detection football caseta, the Volunteer PWA caseta, their outdoor props, the detection screen, commentary desk, task noticeboard, sign-up table, results board, ballot box, voting booth and carpets | `tools/gen-assets.mjs` |
| `public/assets/sprites/player.png` | Player walking sprites | `tools/gen-assets.mjs` |
| `public/assets/sprites/npc.png` | Flamenca NPC sprites | `tools/gen-assets.mjs` |
| `public/assets/sprites/vignette.png` | Warm evening vignette overlay | `tools/gen-assets.mjs` |

The tile index table shared by the art and map scripts is `tools/tileset-layout.mjs`.

## Maps

| File | Made by |
| --- | --- |
| `public/assets/maps/feria.json`, `caseta.json`, `about.json`, `action-detection.json`, `volunteer-pwa.json`, `secure-voting.json` (Tiled 1.10 JSON) | `tools/gen-maps.mjs` |

## Audio

All sound is synthesised sample by sample and written as 16-bit mono 22050 Hz WAV.

| File | What it is | Made by |
| --- | --- | --- |
| `public/assets/audio/ambient.wav` | 20 s seamless loop: plucked-guitar arpeggios over the Andalusian cadence (Am, G, F, E), soft palmas and a crowd-murmur bed | `tools/gen-audio.mjs` |
| `public/assets/audio/step.wav` | Footstep on sand | `tools/gen-audio.mjs` |
| `public/assets/audio/door.wav` | Wooden knock and a two-note chime | `tools/gen-audio.mjs` |
| `public/assets/audio/blip.wav` | Dialogue typewriter tick | `tools/gen-audio.mjs` |

## Code libraries

These are software dependencies, not assets:

- [Phaser 3](https://phaser.io) (MIT License): game engine
- [TypeScript](https://www.typescriptlang.org) (Apache License 2.0), [Vite](https://vite.dev) (MIT) and [Vitest](https://vitest.dev) (MIT): language, build and tests

## Regenerating

```sh
node tools/gen-assets.mjs   # PNGs
node tools/gen-maps.mjs     # Tiled JSON maps
node tools/gen-audio.mjs    # WAVs
```
