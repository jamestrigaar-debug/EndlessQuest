import type { System } from '../../ecs/System';
import type { GameState } from '../../state/GameState';
import type { GameEvent } from '../../../events/GameEvent';
import { EventBus } from '../../../events/EventBus';

export class TimeSystem implements System {
  readonly name = 'TimeSystem';
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  update(state: GameState): void {
    // Emit time-based events
    // Every 24 ticks (1 day) log a day change? Actually we advance by hours, so check day transitions via tick?
    // For now, log if hour is 0 (midnight) or 6 (dawn) etc
    if (state.hour === 0) {
      const event: GameEvent = {
        tick: state.tick,
        type: 'system',
        message: `Night falls. Day ${state.day} of year ${state.year} begins.`,
        data: { day: state.day, year: state.year },
      };
      state.log.push(event);
      this.eventBus.emit(event);
    } else if (state.hour === 6) {
      const event: GameEvent = {
        tick: state.tick,
        type: 'system',
        message: `Dawn breaks on day ${state.day}.`,
        data: { hour: state.hour },
      };
      state.log.push(event);
      this.eventBus.emit(event);
    }

    // Seasonal placeholder: every 90 days season change
    if (state.day % 90 === 1 && state.hour === 6) {
      const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
      const seasonIndex = Math.floor((state.day - 1) / 90) % 4;
      const season = seasons[seasonIndex];
      const event: GameEvent = {
        tick: state.tick,
        type: 'system',
        message: `${season} has arrived.`,
        data: { season },
      };
      state.log.push(event);
      this.eventBus.emit(event);
    }
  }
}
