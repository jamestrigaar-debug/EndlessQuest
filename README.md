# EndlessQuest

 — Implementation Framework
Version 1.0 — Architectural Blueprint
This document defines the coding framework for The Road Beyond, aligning with the established mathematical foundation and design goals. It is intended as a blueprint for implementation, not as actual code.

1. Technology Stack
Layer	Choice	Rationale
Language	TypeScript (strict)	Type safety, modern tooling, maintainability
Core simulation	Framework-agnostic TypeScript library	Reusable, testable, no UI dependencies
UI	WebGL (via PixiJS or raw) + HTML/CSS overlay	Pixel-art rendering, performant on low-end devices
Build tool	Vite	Fast dev server, TypeScript support, code splitting
Monorepo	pnpm workspaces + Turborepo	Separate packages for core and UI
Testing	Vitest	Fast, modern, TypeScript-native
Data	TypeScript constants initially	Later migrate to YAML/JSON with schema validation
Code style	ESLint + Prettier	Consistent style
Recommendation: Use a custom lightweight WebGL renderer (e.g., based on PixiJS) for the map and sprites, with HTML/CSS for UI panels (status, dialogue, inventory). This keeps the core independent.

2. Overall Architecture
text
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer (UI)                 │
│  React/Vue/Svelte (optional) or Vanilla TS                  │
│  - WebGL map renderer                                        │
│  - HTML/CSS panels for cards, dialogue, log                  │
│  - Command dispatch                                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ Commands (typed)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                      │
│  Command Handlers, Use Cases, Session Management             │
│  - Validate commands                                         │
│  - Load/save state                                           │
│  - Orchestrate game flow (embark, death, new game)           │
└───────────────────────────┬─────────────────────────────────┘
                            │ Domain Services
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Domain Core                           │
│  Pure simulation, no I/O                                     │
│  - Entity Component System (ECS)                             │
│  - Systems: AI, needs, combat, world events, etc.            │
│  - Seeded RNG                                                │
│  - Deterministic simulation loop                             │
└───────────────────────────┬─────────────────────────────────┘
                            │ Events (domain)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Infrastructure                          │
│  Event Store (in-memory/IndexedDB)                           │
│  Snapshot & Log (debugging)                                  │
│  Data Loader (content definitions)                           │
└─────────────────────────────────────────────────────────────┘
Domain Core is pure: no access to browser APIs, only injected ports (RNG, time, storage).

Application Layer mediates between UI and core, managing transactions.

UI only sends commands and renders state from read models.

3. Domain Core Design
3.1 Entity-Component-System (ECS)
The world state is stored in a lightweight ECS to support flexibility and performance.

Entity: simple ID.

Components (plain data):

Position (x, y, mapId)

Attributes (strength, dexterity, constitution, intelligence, wisdom, charisma)

DerivedStats (hp, maxHp, stamina, etc.)

Needs (hunger, thirst, fatigue, social, safety, purpose)

Inventory (list of item entity IDs)

Equipment (slots)

Conditions (list of condition IDs)

Personality (traits array)

Family (spouse, children, parents, siblings)

Memories (list of memory entries)

Goals (list of goal objects)

Relationships (map of entity ID -> value)

FactionId

Role (job)

Home (settlement/building ID)

Knowledge (set of knowledge IDs)

Age

Gender

Status (alive, dead, etc.)

Morale

Systems (stateless functions or classes with injected dependencies):

TimeSystem: advances clock, triggers seasonal effects.

NeedSystem: decays needs exponentially.

DecisionSystem: utility-based AI using multi-criteria decision making (MCDM), prospect theory, and MDP lookahead.

MovementSystem: resolves movement requests, terrain costs.

ProductionSystem: NPCs produce resources based on role and skill.

PopulationSystem: births, deaths (Gompertz mortality), genetics.

RelationshipSystem: update relationships from interactions, memory decay.

CombatSystem: turn-based combat with Lanchester's laws, fatigue, morale.

WorldEventSystem: Poisson events, cascading effects.

KnowledgeSystem: rumor spread on social network graph, accuracy degradation.

SettlementSystem: manage settlement resources, buildings, carrying capacity.

NetworkSystem: maintain social graph, calculate centrality, diffusion.

3.2 Deterministic Simulation Loop
The core simulation runs on a fixed tick (1 hour game time). Each tick:

Global update: season, weather (using SDE-driven climate model).

Entity updates: age, need decay, health transitions (Markov chains).

Agent decisions: for each NPC (and player if AI-controlled), choose action using utility theory / MDP.

Action execution: resolve movement, production, trade, combat.

Interaction effects: update relationships, memories, knowledge.

Population dynamics: births, deaths, aging, family events.

World events: sample Poisson processes, apply effects, cascade.

Settlement update: resource consumption, production, building condition.

Network update: relationship graph changes, rumor diffusion.

Check player state: hunger, health, death.

The loop is synchronous and deterministic: given a seed and initial state, the same sequence of player commands yields the same simulation. All randomness comes from the injected seeded RNG (ChaCha or xoshiro).

3.3 Seeded RNG
Use xoshiro256++ for speed and quality. A separate RNG instance is used for each domain to isolate randomness (e.g., world gen, combat, world events) to maintain determinism when debugging.

typescript
interface RNG {
  nextInt(min: number, max: number): number;
  nextFloat(): number;
  nextGaussian(): number; // Box-Muller
  fork(): RNG;
}
4. Core Data Structures
4.1 World State
typescript
interface WorldState {
  seed: number;
  tick: number;
  year: number;
  day: number;
  season: Season;
  map: Tile[][];
  entities: Map<EntityId, Entity>;
  settlements: Map<SettlementId, Settlement>;
  pointsOfInterest: Map<POIId, PointOfInterest>;
  socialGraph: SocialGraph;
  eventQueue: PriorityQueue<WorldEvent>;
  log: GameEvent[]; // append-only
  fogOfWar: boolean[][]; // explored tiles
}
4.2 Tile
typescript
interface Tile {
  x: number;
  y: number;
  terrain: TerrainType;
  elevation: number;
  moisture: number;
  road: boolean;
  river: boolean;
  settlementId?: string;
  poiId?: string;
  entities: Set<EntityId>;
  explored: boolean;
}
4.3 Entity
typescript
interface Entity {
  id: EntityId;
  name: string;
  type: 'player' | 'npc' | 'monster';
  position: { x: number; y: number };
  components: {
    attributes?: Attributes;
    derivedStats?: DerivedStats;
    needs?: Needs;
    inventory?: Inventory;
    equipment?: Equipment;
    conditions?: Set<ConditionId>;
    personality?: string[];
    family?: Family;
    memories?: Memory[];
    goals?: Goal[];
    relationships?: Map<EntityId, number>;
    factionId?: string;
    role?: string;
    home?: { settlementId: string; buildingId: string };
    knowledge?: Set<KnowledgeId>;
    age?: number;
    gender?: 'male' | 'female';
    status?: 'alive' | 'dead' | 'missing';
    morale?: number;
    strategy?: string; // for game theory
    qTable?: Map<string, Map<string, number>>; // for reinforcement learning
  };
}
5. Command Handling & Application Layer
The UI sends Commands:

typescript
type Command =
  | { type: 'MOVE'; direction: 'north' | 'south' | 'east' | 'west' }
  | { type: 'TALK'; npcId: string; topicId: string }
  | { type: 'USE_ITEM'; itemId: string }
  | { type: 'EQUIP_ITEM'; itemId: string; slot: string }
  | { type: 'ATTACK'; targetId: string; weaponId?: string }
  | { type: 'REST'; hours: number }
  | { type: 'SEARCH' }
  | { type: 'GIVE'; itemId: string; targetId: string }
  | { type: 'FLEE' }
  | { type: 'NEW_GAME'; seed?: number }
  | { type: 'SAVE_GAME' }
  | { type: 'LOAD_GAME' };
Each command is validated by an Application Service that loads the current state, executes the command within a transaction, and stores the resulting events.

Event Log: Every state change is recorded as a GameEvent (e.g., PLAYER_MOVED, NPC_DIED, COMBAT_STARTED). This log is used for debugging and can be replayed.

6. UI / Rendering
6.1 Map Rendering
Use WebGL (PixiJS) for the map.

Tiles are rendered as colored rectangles initially (placeholder art).

Later, replace with pixel-art sprite sheets.

Fog of war: unexplored tiles are black; explored but unseen are dimmed.

Player can pan and zoom (limited to explored area? Or all? We'll allow panning over explored tiles only for now).

6.2 UI Panels
Top status bar: HP, stamina, hunger, thirst, morale, time, location.

Bottom log: recent events and dialogues.

Card panel: inventory and conditions as cards (HTML/CSS for now).

Action buttons: contextual buttons (move, talk, rest, etc.) generated from available actions.

6.3 Rendering Loop
The UI subscribes to the application layer's state change notifications and re-renders only affected parts. The simulation runs synchronously on command, so no continuous rendering loop is required for the simulation itself; only for animations.

7. Persistence
Save: Serialize the entire WorldState (including RNG state) to JSON. Store in IndexedDB or localStorage.

Load: Deserialize and resume exactly.

Determinism: The save includes the seed and RNG state to continue exactly.

8. Implementation Order
Core foundations: ECS, RNG, state management, event log.

Map generation: terrain, rivers, roads, settlements.

NPC generation: attributes, families, roles.

Basic simulation loop: time, needs, movement.

UI skeleton: map renderer, status bar, command buttons.

Pre-embark simulation: run world for N years, display log.

Player embark: movement, fog of war.

Survival: eat, drink, rest.

NPC interaction: dialogue topics, trade.

Combat: turn-based, deadly.

Population dynamics: births, deaths, aging.

Advanced AI: utility, MDP, game theory.

World events: Poisson, cascades.

Social network: relationships, rumor spread.

Save/load.

Death & legacy: continue world with new character.

9. Performance Considerations
Use sparse data structures for social graph (Map of Maps).

Limit active simulation to entities within a radius of player? No — full simulation of all NPCs is required for world coherence. But for MVP, 200 NPCs is manageable with simple math on modern hardware.

Use object pooling for temporary objects (e.g., pathfinding).

Precompute terrain adjacency and pathfinding graphs (A*) only when needed.

10. Testing
Unit tests: each system (needs, utility, combat, genetics) with mocked RNG.

Determinism tests: run simulation with same seed and command sequence, compare state hashes.

Integration tests: world generation, pre-embark simulation, full game loop.

Performance tests: 100x100 map, 200 NPCs, 1000 ticks.
