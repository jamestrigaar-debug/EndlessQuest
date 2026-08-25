import type { System } from '../../ecs/System';
import type { GameState } from '../../state/GameState';
import type { GameEvent } from '../../../events/GameEvent';
import { EventBus } from '../../../events/EventBus';
import {
  HOURS_PER_DAY,
  DAYS_PER_SEASON,
  DAYS_PER_YEAR,
  INITIAL_HOUR,
  INITIAL_DAY,
  INITIAL_YEAR,
} from '../../SimulationConstants';

/**
 * System monitoring temporal transitions (day/night cycles, dawn, seasonal boundaries)
 * across elapsed simulation ticks.
 */
export class TimeSystem implements System {
  readonly name = 'TimeSystem';
  private eventBus: EventBus;
  private lastProcessedTick: number = 0;

  /**
   * @param eventBus EventBus instance to broadcast time events
   */
  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Checks for time milestones crossed between the previous and current simulation ticks.
   * Emits notifications for nightfall (hour 0), dawn (hour 6), and seasonal shifts.
   * @param state Current GameState
   */
  update(state: GameState): void {
    if (state.tick <= this.lastProcessedTick) {
      return;
    }

    // Iterate through all elapsed tick intervals to prevent skipping events during multi-hour jumps
    for (let t = this.lastProcessedTick + 1; t <= state.tick; t++) {
      const totalHours = t + INITIAL_HOUR;
      const hour = totalHours % HOURS_PER_DAY;
      const totalDays = Math.floor(totalHours / HOURS_PER_DAY);
      const day = (totalDays % DAYS_PER_YEAR) + INITIAL_DAY;
      const year = Math.floor(totalDays / DAYS_PER_YEAR) + INITIAL_YEAR;

      if (hour === 0) {
        const event: GameEvent = {
          tick: t,
          type: 'system',
          message: `Night falls. Day ${day} of year ${year} begins.`,
          data: { day, year },
        };
        state.log.push(event);
        this.eventBus.emit(event);
      } else if (hour === 6) {
        const event: GameEvent = {
          tick: t,
          type: 'system',
          message: `Dawn breaks on day ${day}.`,
          data: { day, hour },
        };
        state.log.push(event);
        this.eventBus.emit(event);

        // Seasonal transitions occur at dawn on the first day of each 90-day season
        if (day % DAYS_PER_SEASON === 1) {
          const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
          const seasonIndex = Math.floor((day - 1) / DAYS_PER_SEASON) % seasons.length;
          const season = seasons[seasonIndex];
          const seasonEvent: GameEvent = {
            tick: t,
            type: 'system',
            message: `${season} has arrived.`,
            data: { season, year },
          };
          state.log.push(seasonEvent);
          this.eventBus.emit(seasonEvent);
        }
      }
    }

    this.lastProcessedTick = state.tick;
  }
}
