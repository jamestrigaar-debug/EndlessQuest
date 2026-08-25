import { describe, it, expect } from 'vitest';
import { World } from '../src/core/ecs/World';
import type { Component } from '../src/core/ecs/Component';

interface TestComp extends Component {
  type: 'test';
  value: number;
}
interface OtherComp extends Component {
  type: 'other';
  name: string;
}

describe('ECS World', () => {
  it('entity creation/destruction works', () => {
    const world = new World();
    const id1 = world.createEntity();
    const id2 = world.createEntity();
    expect(id1).not.toBe(id2);
    expect(world.getAllEntities()).toContain(id1);
    expect(world.getAllEntities()).toContain(id2);
    expect(world.size).toBe(2);

    world.destroyEntity(id1);
    expect(world.getEntity(id1)).toBeUndefined();
    expect(world.getAllEntities()).not.toContain(id1);
    expect(world.size).toBe(1);
  });

  it('component add/get/remove works', () => {
    const world = new World();
    const id = world.createEntity();
    const comp: TestComp = { type: 'test', value: 42 };
    world.addComponent(id, comp);

    expect(world.hasComponent(id, 'test')).toBe(true);
    const retrieved = world.getComponent<TestComp>(id, 'test');
    expect(retrieved).toBeDefined();
    expect(retrieved!.value).toBe(42);

    world.removeComponent(id, 'test');
    expect(world.hasComponent(id, 'test')).toBe(false);
    expect(world.getComponent(id, 'test')).toBeUndefined();
  });

  it('query returns correct entities', () => {
    const world = new World();
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    const e3 = world.createEntity();

    world.addComponent<TestComp>(e1, { type: 'test', value: 1 });
    world.addComponent<OtherComp>(e1, { type: 'other', name: 'a' });

    world.addComponent<TestComp>(e2, { type: 'test', value: 2 });

    world.addComponent<OtherComp>(e3, { type: 'other', name: 'b' });

    const withTest = world.query('test');
    expect(withTest).toContain(e1);
    expect(withTest).toContain(e2);
    expect(withTest).not.toContain(e3);
    expect(withTest.length).toBe(2);

    const withBoth = world.query('test', 'other');
    expect(withBoth).toEqual([e1]);
  });

  it('removing component updates queries', () => {
    const world = new World();
    const e1 = world.createEntity();
    world.addComponent<TestComp>(e1, { type: 'test', value: 1 });
    expect(world.query('test')).toContain(e1);

    world.removeComponent(e1, 'test');
    expect(world.query('test')).not.toContain(e1);
  });

  it('destroying entity removes it from all queries', () => {
    const world = new World();
    const e1 = world.createEntity();
    world.addComponent<TestComp>(e1, { type: 'test', value: 1 });
    world.addComponent<OtherComp>(e1, { type: 'other', name: 'x' });

    expect(world.query('test')).toContain(e1);
    expect(world.query('other')).toContain(e1);

    world.destroyEntity(e1);
    expect(world.query('test')).not.toContain(e1);
    expect(world.query('other')).not.toContain(e1);
  });

  it('getComponent returns undefined for missing entity', () => {
    const world = new World();
    expect(world.getComponent(999, 'test')).toBeUndefined();
  });
});
