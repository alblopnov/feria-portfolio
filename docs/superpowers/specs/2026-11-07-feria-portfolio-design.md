# Feria Portfolio: Design Spec

Date: 2026-11-07

## 1. Purpose

A personal portfolio site built as an explorable, Pokémon-style 2D overworld set in a Seville feria. Each building (caseta) is one of the author's projects. The goal is twofold: **learning** (game architecture, TypeScript, tooling, deployment) and a **portfolio piece** that is memorable to recruiters and peers.

The world doubles as a visible roadmap: projects not yet finished appear as locked "under construction" casetas and unlock as they are completed.

### Success criteria

- A visitor can open the URL, walk the town, enter the Caseta-musica club and the About house, and reach Contact, on desktop and on a phone.
- Adding a new project requires placing one building in the Tiled map and adding one entry to the content file, with no engine changes.
- The site is a static build, deployed for free, with no backend.
- A recruiter-facing README explains what it is and how it was built.

### Out of scope for v1

Combat, inventory, save files, multiplayer, and embedding the live Caseta-musica app.

## 2. Stack

- **Phaser 3** (rendering, input, scenes, tilemaps)
- **TypeScript**
- **Vite** (dev server, build)
- **Tiled** (map editor; exports JSON maps loaded by Phaser)
- **Vitest** (unit tests)
- **GitHub Actions + GitHub Pages** (build and deploy on push to `main`)

## 3. Architecture

```
src/
  main.ts            Phaser game config and startup
  scenes/
    BootScene        loads assets, shows a loading bar
    WorldScene       the feria overworld (walking, NPCs, doors)
    InteriorScene    one reusable, data-driven interior (Caseta, About, ...)
  systems/
    GridMovement     tile-by-tile walking and collision
    Interaction      "press Z/Enter" on doors, signs, NPCs
    DialogueBox      Pokémon-style text box with typewriter effect and paging
  content/
    projects.ts      one entry per building
public/assets/       tilesets, sprites, audio, Tiled maps (.json)
```

**Key principle:** the map defines *where* things are; `projects.ts` defines *what* they are. A Tiled building object carries only an `id` (for example `caseta`). The game looks the id up in `projects.ts`. An entry with `locked: true` shows the "Under construction" sign and a teaser; flipping it to `false` unlocks the building.

**Scenes:** Boot loads assets; World handles the town; a single Interior scene serves every building interior, driven by the entry's `interior` field.

**Controls:** arrow keys or WASD to move, Z or Enter to interact. On-screen touch controls are added in the Ship milestone so the site works on phones.

## 4. World and content (v1)

**Map:** one overworld, about 40x30 tiles, laid out like a feria ground: a main street of albero (ochre sand) from the portada gate (player spawn), with casetas along both sides.

**Buildings:**

| Building | State | Notes |
| --- | --- | --- |
| Caseta-musica | unlocked | Seville-style caseta: striped canvas front, farolillos, lit sign. Interior has a stage and a jukebox. |
| About me house | unlocked | Bookshelf for skills, desk for the author's story. |
| Contact post box | unlocked | Interact to show email and GitHub links. |
| ML Classifier caseta | locked | Teaser and "Under construction" sign. |
| Java Service caseta | locked | Same. |
| Dashboard caseta | locked | Same. |

**Decor and NPCs:** bunting, a distant fairground attraction, and two or three NPCs who give exploration tips and hint at upcoming projects.

**Caseta-musica interior (decision: in-world only for v1):** interacting with the jukebox shows a project card with description, tech, screenshots and a GitHub link. A built-in mini music demo is a possible later upgrade; the live Flask app is not embedded.

**Content model (`projects.ts`):** each entry has `id`, `title`, `summary`, `tech: string[]`, `links: { label, url }[]`, `locked: boolean`, `teaser`, and `interior` (which room layout to use).

**Art:** free tilesets for base terrain and houses; feria-specific pieces (striped tents, farolillos, bunting) are custom pixel art. No Pokémon characters, names or ripped sprites are used; only the genre's look and feel. A Credits sign in the world lists asset sources and licenses.

**Audio:** one looping ambient track and small effects for footsteps, doors and dialogue. A mute button is always visible.

## 5. Data flow

Boot loads the Tiled map and assets. World reads the map's object layer and builds buildings, doors and NPCs. On interaction, Interaction takes the object's id, looks it up in `projects.ts`, and either enters the Interior scene or shows the locked teaser in the dialogue box.

## 6. Error handling

- A map object whose id is missing from `projects.ts` produces a visible dev-time warning, so typos cannot silently create dead doors.
- A failed asset load shows a friendly "Couldn't load the feria, refresh" screen instead of a black canvas.
- Audio starts only after the first key press (browser autoplay rules); audio failure never blocks gameplay.

## 7. Testing

- **Vitest unit tests** for logic that needs no canvas: grid movement and collision rules, content-lookup validation, and the dialogue pager.
- **Content consistency check** (every building id in the map has a `projects.ts` entry), run in CI.
- **Manual play-through checklist** for visuals and feel.
- **CI:** GitHub Actions runs tests, builds, and deploys to GitHub Pages on push to `main`.

## 8. Milestones (each shippable)

1. **Walk:** empty ochre street, player sprite, grid movement, collisions.
2. **Talk:** dialogue box, one NPC, one sign.
3. **Enter:** doors and the reusable Interior scene with Caseta and About rooms.
4. **Feria:** custom art, lighting, audio, locked casetas.
5. **Ship:** mobile touch controls, credits, deploy to GitHub Pages, recruiter README.

## 9. Open items

- Choice of free tileset and ambient track (to be decided in milestone 1 and 4, subject to license check).
- Final repository name and public URL.
