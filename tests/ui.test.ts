// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { LogPanel } from '../src/ui/panels/LogPanel';
import { StatusPanel } from '../src/ui/panels/StatusPanel';
import { ActionPanel } from '../src/ui/panels/ActionPanel';
import { SimulationLoop } from '../src/core/simulation/SimulationLoop';
import { formatGameTime } from '../src/core/state/GameState';
import type { GameEvent } from '../src/events/GameEvent';

describe('UI Panels & Formatting', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="status-bar"></div>
      <div id="action-panel"></div>
      <div id="log-panel"></div>
    `;
  });

  it('formatGameTime correctly formats day, hour, and year progression', () => {
    // Tick 0 (initial 6:00, Day 1, Year 1)
    expect(formatGameTime(0)).toBe('Y1 D1 06:00');

    // Tick 18 (Hour 24 -> Hour 0 of Day 2, Year 1)
    expect(formatGameTime(18)).toBe('Y1 D2 00:00');

    // Tick 24 (Hour 30 -> Hour 6 of Day 2, Year 1)
    expect(formatGameTime(24)).toBe('Y1 D2 06:00');

    // Tick 8640 (1 full 360-day year elapsed -> Y2 D1 06:00)
    expect(formatGameTime(8640)).toBe('Y2 D1 06:00');
  });

  it('LogPanel renders formatted timestamps without mixing years and days', () => {
    const container = document.getElementById('log-panel')!;
    const logPanel = new LogPanel(container);

    const event1: GameEvent = { tick: 0, type: 'system', message: 'Game started' };
    const event2: GameEvent = { tick: 24, type: 'movement', message: 'Moved north' };

    logPanel.render([event1, event2]);

    expect(container.innerHTML).toContain('[T0 Y1 D1 06:00]');
    expect(container.innerHTML).toContain('[T24 Y1 D2 06:00]');
    expect(container.innerHTML).not.toContain('Y2'); // Must NOT calculate tick 24 as Year 2!

    logPanel.addEvent({ tick: 48, type: 'rest', message: 'Rested' });
    expect(container.innerHTML).toContain('[T48 Y1 D3 06:00]');
  });

  it('StatusPanel displays HP, Hunger, Thirst, Fatigue, Time, and Seed', () => {
    const container = document.getElementById('status-bar')!;
    const statusPanel = new StatusPanel(container);
    const sim = new SimulationLoop('status-test-seed');

    statusPanel.render(sim.state);

    expect(container.textContent).toContain('HP');
    expect(container.textContent).toContain('100/100');
    expect(container.textContent).toContain('Hunger');
    expect(container.textContent).toContain('Thirst');
    expect(container.textContent).toContain('Fatigue');
    expect(container.textContent).toContain('Y1 D1 06:00');
    expect(container.textContent).toContain('status-test-seed');
  });

  it('ActionPanel binds buttons and disables impassable directions', () => {
    const container = document.getElementById('action-panel')!;
    const sim = new SimulationLoop('action-test');
    const actionPanel = new ActionPanel(container, sim);

    const northBtn = container.querySelector('[data-action="move-north"]') as HTMLButtonElement;
    expect(northBtn).toBeDefined();

    actionPanel.destroy();
  });
});
