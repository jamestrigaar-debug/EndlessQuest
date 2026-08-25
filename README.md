# EndlessQuest — Core Foundations & UI Skeleton

A deterministic, text-based roguelike world simulation prototype inspired by Dwarf Fortress. This stage implements the core engine architecture and UI skeleton.

## Features Implemented

- **Deterministic World Generation**: 100x100 tile map from a seed using simplex noise for elevation/moisture.
- **Seeded RNG**: xoshiro256++ (Blackman & Vigna) with fork(), state save/restore, Gaussian.
- **Custom ECS**: Minimal World, Entity, Component, System with query support.
- **GameState**: Central holder for map, entities, RNG, log, time (tick/year/day/hour).
- **Command Pattern**: MOVE, REST, SEARCH, NEW_GAME with validation and time costs.
- **Simulation Loop**: Processes commands, runs systems (TimeSystem), emits events via EventBus.
- **PixiJS Map Renderer**: WebGL tile rendering, viewport culling, player highlight, settlement markers, pan/zoom.
- **UI Panels**: Status bar (HP, hunger, thirst, fatigue, time, location, seed), Action panel (movement grid, rest, search, new game, keyboard shortcuts), Log panel (color-coded, auto-scroll).
- **Testing**: Vitest suites for RNG, ECS, MapGenerator, SimulationLoop/EventBus.

## Tech Stack

- TypeScript strict
- Vite
- PixiJS 7 (WebGL)
- simplex-noise
- Vitest
- pnpm

## Project Structure

```
src/
├── core/
│   ├── ecs/ (Entity, Component, System, World)
│   ├── rng/ (SeededRNG)
│   ├── state/ (GameState, Commands, CommandHandler)
│   ├── world/ (Tile, TerrainType, MapGenerator)
│   └── simulation/ (SimulationLoop, systems/TimeSystem)
├── ui/
│   ├── map/ (MapRenderer)
│   ├── panels/ (StatusPanel, ActionPanel, LogPanel)
│   └── UI.ts
├── events/ (GameEvent, EventBus)
├── utils/ (math)
└── main.ts
tests/
├── rng.test.ts
├── ecs.test.ts
├── mapgen.test.ts
└── simulation.test.ts
```

## Setup

```bash
# install pnpm if needed
corepack enable
pnpm install

# dev server
pnpm run dev
# open http://localhost:5173

# run tests
pnpm test

# build
pnpm run build
pnpm run preview
```

## How to Change Map Size / Seed

- **Map size**: Edit constants in `src/core/world/Tile.ts`:
  ```ts
  export const MAP_WIDTH = 100;
  export const MAP_HEIGHT = 100;
  ```
  And `VIEWPORT_WIDTH/HEIGHT` and `TILE_SIZE` for renderer.

- **Seed**: 
  - URL query: `http://localhost:5173/?seed=myseed123`
  - Input box in action panel + New Game button
  - Programmatically: `simulation.newGame('myseed')`
  - In code: `new SimulationLoop('myseed')`

Same seed => identical map, same RNG sequence, deterministic.

## Architecture Overview

**Determinism**: All randomness via `SeededRNG` in `GameState`. No `Math.random()` in core simulation. MapGenerator uses forked RNGs for noise.

**ECS**: `World` holds entities as `Map<EntityId, EntityRecord>`. Components are plain data with `type` discriminant. Queries filter by component types. Future systems (combat, AI) will be added as `System` implementations.

**GameState**: Immutable-ish central state. `advanceTime` handles hour/day/year rollover. `revealArea` handles fog of war.

**Commands**: Typed discriminated union. `CommandHandler` validates, updates position, reveals tiles, advances time by terrain cost, logs via EventBus.

**SimulationLoop**: Owns RNG, map, world, player creation, systems. `submitCommand` processes command then runs systems. EventBus pub/sub for UI.

**MapRenderer**: PixiJS Application. Only draws tiles in viewport (screen size / tileSize). Colors per terrain type, dimming for explored but not nearby. Player as white rect with yellow border. Supports mouse drag pan, wheel zoom, center button.

**UI**: Plain HTML/CSS panels. `UI` class wires simulation events to panel renders. Keyboard: Arrow keys move, R rest 1h, Shift+R rest 8h, S search.

**Terrain**:
- Plains 0x90B77D cost 1
- Forest 0x2D5016 cost 2
- Hills 0x8B7D6B cost 3
- Mountain 0x808080 cost 4
- Swamp 0x5D4E37 cost 3
- Water 0x4A90E2 impassable
- Unexplored 0x000000

## Testing

- **RNG**: determinism, fork, bounds, float range, gaussian mean/std, state save/restore.
- **ECS**: create/destroy, add/get/remove, query, removal updates, destroy cleans queries.
- **MapGen**: determinism, dimensions, valid terrain, passable ratio >=50%, start pos valid.
- **Simulation**: MOVE updates, impassable rejected, REST advances tick, SEARCH logs, EventBus pub/sub.

Run `pnpm test` — all 29 tests should pass.

## Future Roadmap

- CombatSystem with turn-based, Lanchester laws
- NPC AI: utility-based, MDP, personality
- Population dynamics: births, deaths, genetics (Gompertz)
- SettlementSystem, ProductionSystem
- Social graph, rumor spread, knowledge
- Dialogue & card systems
- Save/load via IndexedDB with RNG state
- Pixel-art sprites, animations, fog of war vision
- World events (Poisson), weather (SDE climate)
- Inventory, equipment, needs decay

## Notes

- No global variables except main entry.
- No circular dependencies.
- Constants for costs, colors, dimensions.
- JSDoc on public methods.
- Performance: viewport culling, no per-frame full redraw unless state changes.

## License

MIT
