import type { EntityId } from './Entity';
import type { Component } from './Component';

export interface EntityRecord {
  id: EntityId;
  components: Map<string, Component>;
}

export class World {
  private entities: Map<EntityId, EntityRecord> = new Map();
  private nextId: number = 1;

  createEntity(): EntityId {
    const id = this.nextId++;
    this.entities.set(id, { id, components: new Map() });
    return id;
  }

  destroyEntity(id: EntityId): void {
    this.entities.delete(id);
  }

  addComponent<T extends Component>(entity: EntityId, component: T): void {
    const record = this.entities.get(entity);
    if (!record) throw new Error(`Entity ${entity} does not exist`);
    record.components.set(component.type, component);
  }

  getComponent<T extends Component>(entity: EntityId, type: string): T | undefined {
    const record = this.entities.get(entity);
    if (!record) return undefined;
    return record.components.get(type) as T | undefined;
  }

  removeComponent(entity: EntityId, type: string): void {
    const record = this.entities.get(entity);
    if (!record) return;
    record.components.delete(type);
  }

  hasComponent(entity: EntityId, type: string): boolean {
    const record = this.entities.get(entity);
    if (!record) return false;
    return record.components.has(type);
  }

  query(...componentTypes: string[]): EntityId[] {
    const result: EntityId[] = [];
    for (const [id, record] of this.entities) {
      let matches = true;
      for (const ct of componentTypes) {
        if (!record.components.has(ct)) {
          matches = false;
          break;
        }
      }
      if (matches) result.push(id);
    }
    return result;
  }

  getEntity(id: EntityId): EntityRecord | undefined {
    return this.entities.get(id);
  }

  getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  clear(): void {
    this.entities.clear();
    this.nextId = 1;
  }

  get size(): number {
    return this.entities.size;
  }
}
