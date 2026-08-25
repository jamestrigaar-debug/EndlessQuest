import { MapRenderer } from './map/MapRenderer';
import { StatusPanel } from './panels/StatusPanel';
import { ActionPanel } from './panels/ActionPanel';
import { LogPanel } from './panels/LogPanel';
import type { SimulationLoop } from '../core/simulation/SimulationLoop';
import type { GameState } from '../core/state/GameState';
import type { GameEvent } from '../events/GameEvent';

export class UI {
  private mapRenderer: MapRenderer;
  private statusPanel: StatusPanel;
  private actionPanel: ActionPanel;
  private logPanel: LogPanel;
  private simulation: SimulationLoop;
  private container: HTMLElement;

  constructor(container: HTMLElement, simulation: SimulationLoop) {
    this.container = container;
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
  }

  async initialize(): Promise<void> {
    await this.mapRenderer.initialize();

    // Subscribe to events
    this.simulation.onEvent((event: GameEvent) => {
      this.logPanel.addEvent(event);
      // Re-render status and action panels on any event
      this.statusPanel.render(this.simulation.state);
      this.actionPanel.render();
      this.mapRenderer.render(this.simulation.state);
    });

    // Initial render
    this.update(this.simulation.state);

    // Center on player
    const pos = this.simulation.state.entities.getComponent(
      this.simulation.state.playerId,
      'position'
    ) as any;
    if (pos) {
      this.mapRenderer.centerOn(pos.x, pos.y);
    }

    // Also listen for new game events to reset log
    this.simulation.getEventBus().subscribe('system', (e) => {
      if (e.message.includes('New game started')) {
        this.logPanel.clear();
        this.logPanel.addEvent(e);
      }
    });
  }

  update(state: GameState): void {
    this.statusPanel.render(state);
    this.actionPanel.render();
    this.mapRenderer.render(state);
    this.logPanel.render(state.log);
  }

  destroy(): void {
    this.mapRenderer.destroy();
    this.statusPanel.destroy();
    this.actionPanel.destroy();
    this.logPanel.destroy();
  }
}
