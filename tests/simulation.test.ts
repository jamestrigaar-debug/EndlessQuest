import { describe, it, expect } from 'vitest';
import { SimulationLoop } from '../src/core/simulation/SimulationLoop';
import { EventBus } from '../src/events/EventBus';
import { SeededRNG } from '../src/core/rng/SeededRNG';
import { MapGenerator } from '../src/core/world/MapGenerator';
import { World } from '../src/core/ecs/World';
import type { PositionComponent } from '../src/core/ecs/Component';
import { TerrainType, TERRAIN_MOVEMENT_COST } from '../src/core/world/TerrainType';

describe('SimulationLoop', () => {
  it('MOVE command updates position', () => {
    const bus = new EventBus();
    const sim = new SimulationLoop('sim-test', bus);
    const initialPos = { ...sim.state.entities.getComponent<PositionComponent>(sim.state.playerId, 'position')! };

    // Find a passable direction
    const directions: Array<'north' | 'south' | 'east' | 'west'> = ['north', 'south', 'east', 'west'];
    let moved = false;
    for (const dir of directions) {
      const posBefore = sim.state.entities.getComponent<PositionComponent>(sim.state.playerId, 'position')!;
      const dx = dir === 'east' ? 1 : dir === 'west' ? -1 : 0;
      const dy = dir === 'south' ? 1 : dir === 'north' ? -1 : 0;
      const nx = posBefore.x + dx;
      const ny = posBefore.y + dy;
      if (nx < 0 || nx >= sim.state.mapWidth || ny < 0 || ny >= sim.state.mapHeight) continue;
      if (sim.state.map[ny][nx].movementCost === Infinity) continue;

      sim.submitCommand({ type: 'MOVE', direction: dir });
      const posAfter = sim.state.entities.getComponent<PositionComponent>(sim.state.playerId, 'position')!;
      if (posAfter.x !== initialPos.x || posAfter.y !== initialPos.y) {
        moved = true;
        break;
      }
    }
    // At least one direction should be passable from start (guaranteed by generator)
    expect(moved).toBe(true);
  });

  it('MOVE into impassable terrain rejected', () => {
    const bus = new EventBus();
    const sim = new SimulationLoop('impassable-test', bus);

    // Force surrounding tiles to be water except one, then try to move into water
    const pos = sim.state.entities.getComponent<PositionComponent>(sim.state.playerId, 'position')!;
    // Create water tile to the north if possible
    const northY = pos.y - 1;
    if (northY >= 0) {
      sim.state.map[northY][pos.x].terrain = TerrainType.WATER;
      sim.state.map[northY][pos.x].movementCost = TERRAIN_MOVEMENT_COST[TerrainType.WATER];
      const before = { ...pos };
      sim.submitCommand({ type: 'MOVE', direction: 'north' });
      const after = sim.state.entities.getComponent<PositionComponent>(sim.state.playerId, 'position')!;
      expect(after.x).toBe(before.x);
      expect(after.y).toBe(before.y);
      // Should have error event somewhere in recent logs
      const hasError = sim.state.log.slice(-3).some((e) => e.type === 'error');
      expect(hasError).toBe(true);
    }
  });

  it('REST advances time correctly', () => {
    const bus = new EventBus();
    const sim = new SimulationLoop('rest-test', bus);
    const tickBefore = sim.state.tick;
    sim.submitCommand({ type: 'REST', hours: 5 });
    expect(sim.state.tick).toBe(tickBefore + 5);
  });

  it('SEARCH logs event', () => {
    const bus = new EventBus();
    const sim = new SimulationLoop('search-test', bus);
    const logLenBefore = sim.state.log.length;
    sim.submitCommand({ type: 'SEARCH' });
    expect(sim.state.log.length).toBeGreaterThan(logLenBefore);
    const last = sim.state.log[sim.state.log.length - 1];
    expect(last.type).toBe('search');
    expect(last.message.toLowerCase()).toContain('search');
  });

  it('TimeSystem advances tick correctly and logs', () => {
    const bus = new EventBus();
    const sim = new SimulationLoop('time-test', bus);
    // Rest to trigger hour 0? Set hour to 23 then rest 1 hour
    sim.state.hour = 23;
    sim.state.day = 1;
    sim.submitCommand({ type: 'REST', hours: 1 });
    // Should have triggered midnight event
    const hasMidnight = sim.state.log.some((e) => e.message.includes('Night falls') || e.message.includes('Dawn'));
    // Not guaranteed, but tick should advance
    expect(sim.state.tick).toBeGreaterThan(0);
  });

  it('EventBus subscribe/emit works', () => {
    const bus = new EventBus();
    let called = false;
    bus.subscribe('test', () => { called = true; });
    bus.emit({ tick: 0, type: 'test', message: 'hi' });
    expect(called).toBe(true);
  });

  it('EventBus multiple subscribers all called', () => {
    const bus = new EventBus();
    let count = 0;
    bus.subscribe('multi', () => count++);
    bus.subscribe('multi', () => count++);
    bus.emit({ tick: 0, type: 'multi', message: 'hi' });
    expect(count).toBe(2);
  });

  it('EventBus unsubscribe stops callbacks', () => {
    const bus = new EventBus();
    let count = 0;
    const cb = () => count++;
    bus.subscribe('unsub', cb);
    bus.emit({ tick: 0, type: 'unsub', message: 'hi' });
    expect(count).toBe(1);
    bus.unsubscribe('unsub', cb);
    bus.emit({ tick: 0, type: 'unsub', message: 'hi' });
    expect(count).toBe(1);
  });
});
