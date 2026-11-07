# Feria Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, Pokémon-style explorable feria town in the browser where each caseta is one of the author's projects.

**Architecture:** Phaser 3 scenes (Boot, World, Interior) driven by Tiled JSON maps. Game rules that need no canvas (movement, interaction lookup, dialogue paging, content validation, touch input) live in small pure TypeScript modules under `src/systems/` and `src/content/`, unit-tested with Vitest. A single `projects.ts` file defines what each building is; the map only says where it is.

**Tech Stack:** Phaser 3, TypeScript, Vite, Tiled (map editor), Vitest, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-07-feria-portfolio-design.md`

## Global Constraints

- Static site only: no backend, no server code.
- `TILE_SIZE = 16`; logical resolution `GAME_WIDTH = 320`, `GAME_HEIGHT = 240` (20x15 tiles in view); pixel-art rendering (`pixelArt: true`), scaled with `Phaser.Scale.FIT`.
- Overworld map is about 40x30 tiles.
- Controls: arrow keys or WASD to move, Z or Enter to interact; touch controls for phones.
- No Pokémon characters, names or ripped sprites. Only free-licensed tilesets; every asset source and license is listed on an in-world Credits sign.
- Project data lives only in `src/content/projects.ts`; map objects carry only an `id`.
- v1 buildings and states: `caseta` (unlocked), `about` (unlocked), `contact` (unlocked), `ml-classifier`, `java-service`, `dashboard` (all `locked: true`).
- Caseta-musica is in-world only (project card at the jukebox); the live Flask app is not embedded.
- Out of scope: combat, inventory, save files, multiplayer.
- Deploy: GitHub Actions builds and deploys to GitHub Pages on push to `main`.
- Commits use the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Map object with an `id` missing from `projects.ts`: a visible warning, never a crash or a silently dead door (Tasks 3, 5).
- Player walking into the map edge or a blocked tile: stays put, no exception (Task 2).
- Two keys held at once (for example Up and Right): exactly one direction is used, no diagonal movement (Task 2).
- Empty text, or one very long word, passed to the dialogue box: no infinite loop, no empty crash (Task 4).
- Audio blocked by autoplay rules, or never unlocked: the game still runs, the mute button still works (Task 8).
- A tap or tiny drag on touch controls: no accidental movement (Task 10).

---

### Task 1: Scaffold and boot

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`
- Create: `src/main.ts`, `src/config.ts`, `src/scenes/BootScene.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces: `src/config.ts` exports `TILE_SIZE: number`, `GAME_WIDTH: number`, `GAME_HEIGHT: number`. `BootScene` registered under key `'Boot'`, starts `'World'` when loading finishes.

- [ ] **Step 1: Initialise tooling.** `npm init -y`, then install `phaser`, and dev-install `typescript`, `vite`, `vitest`. Add scripts `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`). `vite.config.ts` reads `base` from `process.env.VITE_BASE ?? '/'`.
- [ ] **Step 2: Write the failing test** `tests/config.test.ts`: `expect(GAME_WIDTH % TILE_SIZE).toBe(0)`, `expect(GAME_HEIGHT % TILE_SIZE).toBe(0)`, `expect(TILE_SIZE).toBe(16)`.
- [ ] **Step 3: Run** `npm test`. Expected: FAIL (module `src/config` not found).
- [ ] **Step 4: Implement** `src/config.ts` with the constants from Global Constraints, `src/main.ts` creating a `Phaser.Game` (`pixelArt: true`, `Scale.FIT`, `autoCenter`, parent `#game`, scenes `[BootScene]` for now), and `BootScene` showing a loading bar and logging "boot done".
- [ ] **Step 5: Run** `npm test` (PASS) and `npm run build` (succeeds). Run `npm run dev` and confirm a canvas appears at 4:3 in the browser.
- [ ] **Step 6: Commit** `chore: scaffold Phaser + Vite + TypeScript project`.

### Task 2: Grid movement logic

**Files:**
- Create: `src/systems/gridMovement.ts`
- Test: `tests/gridMovement.test.ts`

**Interfaces:**
- Produces:
  - `type Direction = 'up' | 'down' | 'left' | 'right'`
  - `type Tile = { x: number; y: number }`
  - `step(pos: Tile, dir: Direction): Tile`
  - `canMove(pos: Tile, dir: Direction, isBlocked: (t: Tile) => boolean, bounds: { width: number; height: number }): boolean` (bounds in tiles)
  - `resolveDirection(pressed: Direction[], last: Direction | null): Direction | null` returns the most recently pressed direction in `pressed`, or `last` if still held, or `null` when none held.

- [ ] **Step 1: Write failing tests:** `step({x:2,y:2},'up')` equals `{x:2,y:1}` (and the three other directions); `canMove` is false when the target tile is blocked, false at `x=0` going left and at `y=height-1` going down, true on a free tile; `resolveDirection(['up','right'], 'up')` returns exactly one direction (never a pair) and `resolveDirection([], 'up')` returns `null`.
- [ ] **Step 2: Run** `npx vitest run tests/gridMovement.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the three functions as pure functions with the signatures above.
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: grid movement and direction resolution`.

### Task 3: Content model and validation

**Files:**
- Create: `src/content/projects.ts`
- Test: `tests/projects.test.ts`

**Interfaces:**
- Produces:
  - `type Project = { id: string; title: string; summary: string; tech: string[]; links: { label: string; url: string }[]; locked: boolean; teaser: string; interior: string | null }`
  - `projects: Record<string, Project>` with the six ids from Global Constraints
  - `getProject(id: string): Project | undefined`
  - `findMissingIds(ids: string[], source?: Record<string, Project>): string[]` returns ids not present in `source` (default `projects`), including empty-string ids.

- [ ] **Step 1: Write failing tests:** all six ids exist; `caseta`, `about`, `contact` have `locked === false`; `ml-classifier`, `java-service`, `dashboard` have `locked === true` and a non-empty `teaser`; every unlocked entry with an `interior` has a non-empty `summary`; `findMissingIds(['caseta','nope',''])` equals `['nope','']`.
- [ ] **Step 2: Run** `npx vitest run tests/projects.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** types, the six entries (Caseta-musica summary written from `C:\Users\alope\Caseta-musica\README.md`; `interior` is `'caseta'` / `'about'` / `null`), and both functions.
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: project content model with id validation`.

### Task 4: Dialogue pager

**Files:**
- Create: `src/systems/dialoguePager.ts`
- Test: `tests/dialoguePager.test.ts`

**Interfaces:**
- Produces: `paginate(text: string, maxCharsPerLine: number, maxLines: number): string[]` returns pages, each at most `maxLines` lines of at most `maxCharsPerLine` chars, lines joined by `\n`. Words are not split unless a single word exceeds `maxCharsPerLine`, in which case it is hard-split. Empty or whitespace-only text returns `['']`.

- [ ] **Step 1: Write failing tests:** short text gives one page; a paragraph of 200 chars at `(30, 3)` gives pages that all satisfy the limits and rejoin to the original words; a 100-char single word at `(30, 3)` terminates with every line `<= 30` chars; `paginate('', 30, 3)` equals `['']`; `paginate('   ', 30, 3)` equals `['']`.
- [ ] **Step 2: Run** `npx vitest run tests/dialoguePager.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `paginate` by greedy word wrapping, then grouping lines into pages.
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat: dialogue text pager`.

### Task 5: Overworld map and walking (milestone 1: Walk)

**Files:**
- Create: `public/assets/maps/feria.json` (Tiled export), `public/assets/tilesets/` (free tileset PNG), `public/assets/sprites/player.png`
- Create: `src/systems/mapObjects.ts`, `src/scenes/WorldScene.ts`
- Modify: `src/main.ts` (register `WorldScene`), `src/scenes/BootScene.ts` (load assets, show error screen on load failure)
- Test: `tests/mapObjects.test.ts`, `tests/mapContent.test.ts`

**Interfaces:**
- Consumes: `Direction`, `Tile`, `step`, `canMove`, `resolveDirection` (Task 2); `findMissingIds` (Task 3).
- Produces:
  - `type MapObject = { id: string; type: 'building' | 'npc' | 'sign' | 'door'; tile: Tile }`
  - `parseObjects(layer: { objects: { x: number; y: number; type: string; properties?: { name: string; value: unknown }[] }[] }, tileSize: number): MapObject[]` where `id` comes from the `id` property (missing becomes `''`) and `tile` is pixel position divided by `tileSize`, floored.
  - Tiled map conventions: layers `ground`, `decor`, `collision` (tile layer; any non-zero tile blocks), `objects` (object layer); map size 40x30 tiles; player spawn is an object `type: 'spawn'` named `portada`.

- [ ] **Step 1: Write failing tests:** `parseObjects` converts pixel coordinates (`x: 32, y: 48`, tile size 16) to tile `{x:2, y:3}` and maps an object without an `id` property to `id: ''`; `tests/mapContent.test.ts` loads `public/assets/maps/feria.json`, parses its `objects` layer and asserts `findMissingIds` over all `building` and `door` ids returns `[]`.
- [ ] **Step 2: Run** `npx vitest run`. Expected: FAIL.
- [ ] **Step 3: Implement** `parseObjects`.
- [ ] **Step 4: Build the map in Tiled:** 40x30 tiles, albero street through the middle, `portada` spawn at the gate, the six building objects (ids from Global Constraints) and a collision layer around walls and buildings, using a free tileset. Export as JSON to the path above.
- [ ] **Step 5: Implement `WorldScene`:** loads `feria.json`, builds layers, places the player at `portada`, moves tile by tile with a short tween using `canMove` and `resolveDirection` from keyboard (arrows and WASD), camera follows the player. In `BootScene`, a `loaderror` handler shows the text "Couldn't load the feria, refresh".
- [ ] **Step 6: Run** `npm test` (PASS). Run `npm run dev` and verify by hand: the player walks the street, cannot pass walls or the map edge, holding Up and Right moves one axis only. Temporarily rename `feria.json` and confirm the load-error screen appears, then restore it.
- [ ] **Step 7: Commit** `feat: overworld map with grid walking and load error screen`.

### Task 6: Interaction, dialogue box, NPC and sign (milestone 2: Talk)

**Files:**
- Create: `src/systems/interaction.ts`, `src/systems/DialogueBox.ts`
- Modify: `src/scenes/WorldScene.ts`, `public/assets/maps/feria.json` (add one NPC and one sign object)
- Test: `tests/interaction.test.ts`

**Interfaces:**
- Consumes: `Direction`, `Tile`, `step` (Task 2); `MapObject` (Task 5); `paginate` (Task 4).
- Produces:
  - `facingTile(pos: Tile, dir: Direction): Tile`
  - `findInteractable(objects: MapObject[], target: Tile): MapObject | undefined`
  - `DialogueBox` (Phaser class): `show(text: string): void` (typewriter effect, pages via `paginate(text, 28, 3)`), `advance(): void` (finish page, then next page, then close), `isOpen(): boolean`. While open, movement input is ignored.

- [ ] **Step 1: Write failing tests:** `facingTile({x:5,y:5},'left')` equals `{x:4,y:5}`; `findInteractable` returns the object on the target tile and `undefined` on an empty tile.
- [ ] **Step 2: Run** `npx vitest run tests/interaction.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** both functions, then `DialogueBox` and wire Z/Enter in `WorldScene`: interacting with an `npc` or `sign` object shows its text (text comes from a `text` property on the object).
- [ ] **Step 4: Run** `npm test` (PASS). Run `npm run dev` and verify by hand: facing the NPC and pressing Z opens a typewriter dialogue box, Z advances pages, the player cannot walk while it is open; an empty `text` property does not crash.
- [ ] **Step 5: Commit** `feat: interaction system and dialogue box`.

### Task 7: Doors and interiors (milestone 3: Enter)

**Files:**
- Create: `src/scenes/InteriorScene.ts`, `src/content/interiors.ts`, `public/assets/maps/caseta.json`, `public/assets/maps/about.json`
- Modify: `src/main.ts`, `src/scenes/WorldScene.ts`, `src/scenes/BootScene.ts`
- Test: `tests/interiors.test.ts`

**Interfaces:**
- Consumes: `getProject`, `Project` (Task 3); `findInteractable`, `facingTile`, `DialogueBox` (Task 6); `parseObjects` (Task 5).
- Produces:
  - `interiors: Record<string, { mapKey: string; mapFile: string }>` with keys `caseta` and `about`
  - `InteriorScene` registered under key `'Interior'`, started with data `{ interiorId: string; returnTile: Tile }`; walking onto its `exit` object returns to `'World'` at `returnTile`.

- [ ] **Step 1: Write failing tests:** every non-null `interior` value in `projects` is a key of `interiors`; every `interiors` entry has a non-empty `mapFile` ending in `.json`.
- [ ] **Step 2: Run** `npx vitest run tests/interiors.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `interiors.ts`, load both interior maps in `BootScene`, and build `InteriorScene` generically from the interior map's objects (`exit`, plus `jukebox` or `bookshelf`/`desk`).
- [ ] **Step 4: In `WorldScene`,** interacting with a `building` object calls `getProject(id)`: if `locked`, show `teaser` in the dialogue box; otherwise start `'Interior'` with the project's `interior` key and the tile in front of the door as `returnTile`. An unknown id shows `console.warn` and an on-screen "??? (missing project)" dialogue instead of crashing.
- [ ] **Step 5: In `InteriorScene`,** interacting with the jukebox shows the Caseta project card (title, summary, tech, links) through the dialogue box; the bookshelf and desk show the About text.
- [ ] **Step 6: Run** `npm test` (PASS). Run `npm run dev` and verify by hand: enter the Caseta and About rooms, read the jukebox card, leave and land back at the door, locked casetas show their teaser, and a temporary map object with a bogus id shows the warning dialogue.
- [ ] **Step 7: Commit** `feat: doors and data-driven interiors`.

### Task 8: Feria art, audio and credits (milestone 4: Feria)

**Files:**
- Create: `src/systems/audioGate.ts`, `public/assets/tilesets/feria-custom.png`, `public/assets/audio/` (ambient loop and effects), `CREDITS.md`
- Modify: `public/assets/maps/feria.json`, `src/scenes/WorldScene.ts`, `src/scenes/InteriorScene.ts`
- Test: `tests/audioGate.test.ts`

**Interfaces:**
- Produces: `createAudioGate(start: () => void): { unlock(): void; isUnlocked(): boolean }`. `unlock()` calls `start` at most once; if `start` throws, the error is caught, `isUnlocked()` stays `false`, and a later `unlock()` may retry.

- [ ] **Step 1: Write failing tests:** `unlock()` twice calls `start` exactly once; a throwing `start` does not propagate and leaves `isUnlocked()` false; a successful `unlock()` makes `isUnlocked()` true.
- [ ] **Step 2: Run** `npx vitest run tests/audioGate.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `createAudioGate`, then in the scenes call `unlock()` on the first key press or pointer-down to start the ambient loop; add footstep, door and dialogue sound effects and an always-visible mute button (top-right) that works whether or not audio is unlocked.
- [ ] **Step 4: Create the custom pixel art** (striped caseta fronts, farolillos, bunting, portada) in `feria-custom.png` and use it in `feria.json`; make the three locked casetas show an "Under construction" sign; add the Credits sign object and `CREDITS.md` listing every asset source and license (check each license before use).
- [ ] **Step 5: Run** `npm test` (PASS). Run `npm run dev` and verify by hand: audio starts after the first key press, mute works before and after, the Caseta looks like a Seville feria caseta, and the Credits sign lists every asset.
- [ ] **Step 6: Commit** `feat: feria art, audio gate and credits`.

### Task 9: Touch controls (milestone 5, part 1)

**Files:**
- Create: `src/systems/touchControls.ts`
- Modify: `src/scenes/WorldScene.ts`, `src/scenes/InteriorScene.ts`
- Test: `tests/touchControls.test.ts`

**Interfaces:**
- Consumes: `Direction` (Task 2).
- Produces: `directionFromDelta(dx: number, dy: number, deadzone: number): Direction | null` returns `null` when `Math.hypot(dx, dy) < deadzone`, otherwise the dominant axis direction (ties go vertical).

- [ ] **Step 1: Write failing tests:** `(0, 0, 8)` is `null`; `(3, 2, 8)` is `null`; `(20, 5, 8)` is `'right'`; `(-4, -30, 8)` is `'up'`; `(10, 10, 8)` is `'down'`.
- [ ] **Step 2: Run** `npx vitest run tests/touchControls.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `directionFromDelta` and an on-screen virtual stick plus an A button that feeds the same movement and interact paths as the keyboard; show them only on touch devices.
- [ ] **Step 4: Run** `npm test` (PASS). In the browser's device emulation, verify by hand: walking, interacting, and leaving rooms all work by touch, and a tap on the stick does not move the player.
- [ ] **Step 5: Commit** `feat: touch controls`.

### Task 10: CI, deploy and README (milestone 5, part 2)

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`
- Modify: `vite.config.ts` (confirm `VITE_BASE` use)

- [ ] **Step 1: Write `deploy.yml`:** on push to `main`, run `npm ci`, `npm test` (includes the map/content consistency check), `npm run build` with `VITE_BASE` set to `/<repo-name>/`, and deploy `dist/` to GitHub Pages with the official Pages actions.
- [ ] **Step 2: Write `README.md`** for recruiters: what the project is, a screenshot or GIF, controls, the stack and why, how to add a project (place a building in Tiled, add one entry to `projects.ts`), how to run it locally, credits link.
- [ ] **Step 3: Run** `npm test` and `VITE_BASE=/feria-portfolio/ npm run build`. Expected: both succeed; serve `dist/` with `npx vite preview` and confirm assets load under the base path.
- [ ] **Step 4: Commit** `ci: deploy to GitHub Pages and add README`.
- [ ] **Step 5: With the author's go-ahead,** create the GitHub repository, push, enable Pages (source: GitHub Actions), and confirm the live URL loads. (Publishing is the author's decision; do not push without asking.)
