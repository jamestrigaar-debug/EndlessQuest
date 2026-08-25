import type { SimulationLoop } from '../../core/simulation/SimulationLoop';
import { TERRAIN_PASSABLE } from '../../core/world/TerrainType';
import type { PositionComponent } from '../../core/ecs/Component';

/**
 * UI panel providing directional movement buttons, action triggers (Rest, Search, New Game),
 * and keyboard shortcut handling.
 */
export class ActionPanel {
  private container: HTMLElement;
  private simulation: SimulationLoop;
  private keydownHandler: (e: KeyboardEvent) => void;

  /**
   * @param container DOM element hosting the action controls
   * @param simulation Active SimulationLoop instance
   */
  constructor(container: HTMLElement, simulation: SimulationLoop) {
    this.container = container;
    this.simulation = simulation;
    this.render();
    this.keydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    window.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Renders the action controls and directional movement grid.
   */
  render(): void {
    const state = this.simulation.state;
    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');

    const canMove = {
      north: this.canMoveTo(pos, 0, -1),
      south: this.canMoveTo(pos, 0, 1),
      east: this.canMoveTo(pos, 1, 0),
      west: this.canMoveTo(pos, -1, 0),
    };

    this.container.innerHTML = `
      <h3>Movement</h3>
      <div id="movement-grid">
        <div></div>
        <button data-action="move-north" ${!canMove.north ? 'disabled' : ''} title="Arrow Up">↑ N</button>
        <div></div>
        <button data-action="move-west" ${!canMove.west ? 'disabled' : ''} title="Arrow Left">← W</button>
        <button data-action="center" title="Center on player">◎</button>
        <button data-action="move-east" ${!canMove.east ? 'disabled' : ''} title="Arrow Right">→ E</button>
        <div></div>
        <button data-action="move-south" ${!canMove.south ? 'disabled' : ''} title="Arrow Down">↓ S</button>
        <div></div>
      </div>
      <h3>Actions</h3>
      <button data-action="rest-1">Rest 1h (R)</button>
      <button data-action="rest-8">Rest 8h (Shift+R)</button>
      <button data-action="search">Search (S)</button>
      <button data-action="new-game" style="margin-top:12px;background:#3a2a2a;">New Game</button>
      <div style="margin-top:12px;font-size:10px;color:#666;">
        Seed: <input id="seed-input" type="text" placeholder="random" style="width:80px;background:#222;color:#ccc;border:1px solid #444;padding:2px;" value="${state.seedString}" />
      </div>
    `;

    this.bindButtons();
  }

  /**
   * Checks if moving by (dx, dy) lands on an in-bounds, passable tile.
   */
  private canMoveTo(pos: PositionComponent | undefined, dx: number, dy: number): boolean {
    if (!pos) return false;
    const state = this.simulation.state;
    const nx = pos.x + dx;
    const ny = pos.y + dy;
    if (nx < 0 || nx >= state.mapWidth || ny < 0 || ny >= state.mapHeight) return false;
    const tile = state.map[ny][nx];
    return TERRAIN_PASSABLE[tile.terrain];
  }

  /**
   * Binds click handlers to button elements.
   */
  private bindButtons(): void {
    const buttons = this.container.querySelectorAll('button');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        if (!action) return;
        switch (action) {
          case 'move-north':
            this.simulation.submitCommand({ type: 'MOVE', direction: 'north' });
            break;
          case 'move-south':
            this.simulation.submitCommand({ type: 'MOVE', direction: 'south' });
            break;
          case 'move-east':
            this.simulation.submitCommand({ type: 'MOVE', direction: 'east' });
            break;
          case 'move-west':
            this.simulation.submitCommand({ type: 'MOVE', direction: 'west' });
            break;
          case 'rest-1':
            this.simulation.submitCommand({ type: 'REST', hours: 1 });
            break;
          case 'rest-8':
            this.simulation.submitCommand({ type: 'REST', hours: 8 });
            break;
          case 'search':
            this.simulation.submitCommand({ type: 'SEARCH' });
            break;
          case 'center':
            window.dispatchEvent(new CustomEvent('center-map'));
            break;
          case 'new-game': {
            const input = this.container.querySelector('#seed-input') as HTMLInputElement;
            const seedVal = input?.value?.trim() || undefined;
            this.simulation.submitCommand({ type: 'NEW_GAME', seed: seedVal });
            break;
          }
        }
      });
    });
  }

  /**
   * Handles keyboard navigation shortcuts.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.simulation.submitCommand({ type: 'MOVE', direction: 'north' });
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.simulation.submitCommand({ type: 'MOVE', direction: 'south' });
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.simulation.submitCommand({ type: 'MOVE', direction: 'west' });
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.simulation.submitCommand({ type: 'MOVE', direction: 'east' });
        break;
      case 'r':
      case 'R': {
        e.preventDefault();
        if (e.shiftKey) {
          this.simulation.submitCommand({ type: 'REST', hours: 8 });
        } else {
          this.simulation.submitCommand({ type: 'REST', hours: 1 });
        }
        break;
      }
      case 's':
      case 'S': {
        e.preventDefault();
        this.simulation.submitCommand({ type: 'SEARCH' });
        break;
      }
    }
  }

  /**
   * Unbinds listeners and clears container.
   */
  destroy(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    this.container.innerHTML = '';
  }
}
