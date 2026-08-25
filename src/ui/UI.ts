import { MapRenderer } from './map/MapRenderer';
import { StatusPanel } from './panels/StatusPanel';
import { ActionPanel } from './panels/ActionPanel';
import { LogPanel } from './panels/LogPanel';
import type { SimulationLoop } from '../core/simulation/SimulationLoop';
import type { GameState } from '../core/state/GameState';
import type { GameEvent } from '../events/GameEvent';
import type { PositionComponent } from '../core/ecs/Component';

/**
 * High-level UI coordinator binding simulation events to MapRenderer and DOM panels.
 */
export class UI {
  private mapRenderer: MapRenderer;
  private statusPanel: StatusPanel;
  private actionPanel: ActionPanel;
  private logPanel: LogPanel;
  private simulation: SimulationLoop;
  private centerMapListener: () => void;
  private eventListener: (event: GameEvent) => void;

  /**
   * @param container Root DOM container element
   * @param simulation SimulationLoop instance
   */
  constructor(_container: HTMLElement, simulation: SimulationLoop) {
    this.simulation = simulation;

    const statusBar = document.getElementById('status-bar')!;
    const mapContainer = document.getElementById('map-container')!;
    const actionPanelEl = document.getElementById('action-panel')!;
    const logPanelEl = document.getElementById('log-panel')!;

    this.mapRenderer = new MapRenderer(
      mapContainer,
      simulation.state.mapWidth,
      simulation.state.mapHeight
    );
    this.statusPanel = new StatusPanel(statusBar);
    this.actionPanel = new ActionPanel(actionPanelEl, simulation);
    this.logPanel = new LogPanel(logPanelEl);

    this.centerMapListener = () => {
      const pos = this.simulation.state.entities.getComponent<PositionComponent>(
        this.simulation.state.playerId,
        'position'
      );
      if (pos) {
        this.mapRenderer.centerOn(pos.x, pos.y);
        this.mapRenderer.render(this.simulation.state);
      }
    };

    this.eventListener = (event: GameEvent) => {
      if (event.type === 'system' && event.message.includes('New game started')) {
        this.logPanel.clear();
      }
      this.logPanel.addEvent(event);
      this.statusPanel.render(this.simulation.state);
      this.actionPanel.render();
      this.mapRenderer.render(this.simulation.state);
    };
  }

  /**
   * Initializes renderer, subscribes to simulation events, and draws initial frame.
   */
  async initialize(): Promise<void> {
    await this.mapRenderer.initialize();

    // Subscribe to all simulation events
    this.simulation.onEvent(this.eventListener);

    // Initial render
    this.update(this.simulation.state);

    // Initial camera position centered on player
    const pos = this.simulation.state.entities.getComponent<PositionComponent>(
      this.simulation.state.playerId,
      'position'
    );
    if (pos) {
      this.mapRenderer.centerOn(pos.x, pos.y);
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('center-map', this.centerMapListener);
    }
  }

  /**
   * Performs full UI update across all panels and renderer.
   * @param state Current GameState
   */
  update(state: GameState): void {
    this.statusPanel.render(state);
    this.actionPanel.render();
    this.mapRenderer.render(state);
    this.logPanel.render(state.log);
  }

  /**
   * Cleans up all sub-panels, renderer, and global event listeners.
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('center-map', this.centerMapListener);
    }
    this.simulation.offEvent(this.eventListener);
    this.mapRenderer.destroy();
    this.statusPanel.destroy();
    this.actionPanel.destroy();
    this.logPanel.destroy();
  }
}
