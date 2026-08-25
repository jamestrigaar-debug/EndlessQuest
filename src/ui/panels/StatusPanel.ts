import type { GameState } from '../../core/state/GameState';
import { getCurrentTile } from '../../core/state/GameState';
import type { PositionComponent, StatsComponent } from '../../core/ecs/Component';
import { DEFAULT_MAX_HP, DEFAULT_INITIAL_HP } from '../../core/SimulationConstants';

/**
 * UI panel rendering player vital statistics, current calendar time, world coordinates, and seed.
 */
export class StatusPanel {
  private container: HTMLElement;

  /**
   * @param container DOM element hosting the status bar
   */
  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Renders current player stats and world information.
   * @param state GameState
   */
  render(state: GameState): void {
    const stats = state.entities.getComponent<StatsComponent>(state.playerId, 'stats');
    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
    const tile = getCurrentTile(state);

    const hp = stats?.hp ?? DEFAULT_INITIAL_HP;
    const maxHp = stats?.maxHp ?? DEFAULT_MAX_HP;
    const hunger = stats?.hunger ?? 0;
    const thirst = stats?.thirst ?? 0;
    const fatigue = stats?.fatigue ?? 0;

    const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    const locationStr = pos ? `${pos.x},${pos.y}` : '';

    this.container.innerHTML = `
      <div class="status-item">
        <span class="status-label">HP</span>
        <span class="status-value">${hp}/${maxHp}</span>
        <div class="hp-bar"><div class="hp-fill" style="width:${hpPercent}%"></div></div>
      </div>
      <div class="status-item">
        <span class="status-label">Hunger</span>
        <span class="status-value">${Math.floor(hunger)}/100</span>
        <div class="need-bar"><div class="need-fill hunger" style="width:${hunger}%"></div></div>
      </div>
      <div class="status-item">
        <span class="status-label">Thirst</span>
        <span class="status-value">${Math.floor(thirst)}/100</span>
        <div class="need-bar"><div class="need-fill thirst" style="width:${thirst}%"></div></div>
      </div>
      <div class="status-item">
        <span class="status-label">Fatigue</span>
        <span class="status-value">${Math.floor(fatigue)}/100</span>
        <div class="need-bar"><div class="need-fill fatigue" style="width:${fatigue}%"></div></div>
      </div>
      <div class="status-item">
        <span class="status-label">Time</span>
        <span class="status-value">Y${state.year} D${state.day} ${String(state.hour).padStart(2, '0')}:00</span>
      </div>
      <div class="status-item">
        <span class="status-label">Location</span>
        <span class="status-value">${tile?.terrain ?? 'unknown'}${locationStr ? ` (${locationStr})` : ''}</span>
      </div>
      <div class="status-item">
        <span class="status-label">Seed</span>
        <span class="status-value">${state.seedString}</span>
      </div>
    `;
  }

  /**
   * Clears panel container contents.
   */
  destroy(): void {
    this.container.innerHTML = '';
  }
}
