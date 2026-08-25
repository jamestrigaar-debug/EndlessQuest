import type { GameEvent } from '../../events/GameEvent';

export class LogPanel {
  private container: HTMLElement;
  private maxEntries: number = 50;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(events: GameEvent[]): void {
    // Keep only last maxEntries
    const recent = events.slice(-this.maxEntries);
    this.container.innerHTML = recent
      .map((e) => {
        const time = `Y${Math.floor(e.tick / 24) + 1} D${Math.floor(e.tick % 365) + 1} ${e.tick % 24}:00`;
        return `<div class="log-entry ${e.type}">[T${e.tick} ${time}] ${this.escapeHtml(e.message)}</div>`;
      })
      .join('');
    // Auto scroll to bottom
    this.container.scrollTop = this.container.scrollHeight;
  }

  addEvent(event: GameEvent): void {
    const time = `Y${Math.floor(event.tick / 24) + 1} D${Math.floor(event.tick % 365) + 1} ${event.tick % 24}:00`;
    const div = document.createElement('div');
    div.className = `log-entry ${event.type}`;
    div.textContent = `[T${event.tick} ${time}] ${event.message}`;

    this.container.appendChild(div);

    // Trim if too many
    while (this.container.children.length > this.maxEntries) {
      this.container.removeChild(this.container.firstChild!);
    }

    this.container.scrollTop = this.container.scrollHeight;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  clear(): void {
    this.container.innerHTML = '';
  }

  destroy(): void {
    this.container.innerHTML = '';
  }
}
