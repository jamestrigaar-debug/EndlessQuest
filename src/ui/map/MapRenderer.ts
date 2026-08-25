import * as PIXI from 'pixi.js';
import type { GameState } from '../../core/state/GameState';
import { TERRAIN_COLOR } from '../../core/world/TerrainType';
import type { PositionComponent } from '../../core/ecs/Component';
import { TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../core/world/Tile';

export class MapRenderer {
  private app: PIXI.Application;
  private container: HTMLElement;
  private tileContainer: PIXI.Container;
  private playerGraphics: PIXI.Graphics;
  private tileGraphics: Map<string, PIXI.Graphics> = new Map();
  private tileSize: number = TILE_SIZE;
  private viewportWidth: number = VIEWPORT_WIDTH;
  private viewportHeight: number = VIEWPORT_HEIGHT;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isDragging: boolean = false;
  private lastDragPos: { x: number; y: number } | null = null;
  private zoom: number = 1;
  private initialized: boolean = false;

  constructor(container: HTMLElement, mapWidth: number, mapHeight: number) {
    this.container = container;
    this.tileContainer = new PIXI.Container();
    this.playerGraphics = new PIXI.Graphics();

    // Create Pixi Application
    this.app = new PIXI.Application({
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());

    // Center initially
    this.offsetX = Math.floor(mapWidth / 2);
    this.offsetY = Math.floor(mapHeight / 2);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.container.appendChild(this.app.view as HTMLCanvasElement);

    this.app.stage.addChild(this.tileContainer);
    this.tileContainer.addChild(this.playerGraphics);

    // Setup interaction
    this.setupInteraction();

    this.initialized = true;
  }

  private handleResize(): void {
    if (!this.app) return;
    this.app.renderer.resize(this.container.clientWidth, this.container.clientHeight);
  }

  private setupInteraction(): void {
    const canvas = this.app.view as HTMLCanvasElement;
    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastDragPos = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.lastDragPos = null;
      canvas.style.cursor = 'grab';
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging || !this.lastDragPos) return;
      const dx = e.clientX - this.lastDragPos.x;
      const dy = e.clientY - this.lastDragPos.y;
      this.pan(-dx / (this.tileSize * this.zoom), -dy / (this.tileSize * this.zoom));
      this.lastDragPos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.zoom = Math.max(0.5, Math.min(2.5, this.zoom + delta));
    });

    // Center on event
    window.addEventListener('center-map', () => {
      const evt = window as any;
      if (evt._lastPlayerPos) {
        this.centerOn(evt._lastPlayerPos.x, evt._lastPlayerPos.y);
      }
    });
  }

  render(state: GameState): void {
    if (!this.initialized) return;

    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
    if (!pos) return;

    // Store for center event
    (window as any)._lastPlayerPos = { x: pos.x, y: pos.y };

    // Auto-center if player near edge of viewport? For simplicity, always center unless dragging
    if (!this.isDragging) {
      // Only auto-center if we are far from player? Let's lerp towards player for smooth feel
      // For now, just center if offset is not near player (initial)
      const dist = Math.hypot(this.offsetX - pos.x, this.offsetY - pos.y);
      if (dist > 5) {
        // Slowly lerp? Actually instant center for MVP
        // this.centerOn(pos.x, pos.y);
      }
    }

    // Clear previous tiles
    // Instead of destroying all, we reuse
    this.tileContainer.removeChildren();
    this.tileGraphics.clear();

    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;

    const tilesX = Math.ceil(screenWidth / (this.tileSize * this.zoom)) + 2;
    const tilesY = Math.ceil(screenHeight / (this.tileSize * this.zoom)) + 2;

    const halfX = Math.floor(tilesX / 2);
    const halfY = Math.floor(tilesY / 2);

    const startX = Math.floor(this.offsetX - halfX);
    const endX = Math.floor(this.offsetX + halfX);
    const startY = Math.floor(this.offsetY - halfY);
    const endY = Math.floor(this.offsetY + halfY);

    // Draw tiles
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || x >= state.mapWidth || y < 0 || y >= state.mapHeight) continue;
        const tile = state.map[y][x];
        const g = new PIXI.Graphics();

        let color: number;
        if (!tile.explored) {
          color = 0x000000;
        } else {
          color = TERRAIN_COLOR[tile.terrain];
          // Dim if not currently visible? For now, if not within 2 of player, dim slightly
          const distToPlayer = Math.max(Math.abs(x - pos.x), Math.abs(y - pos.y));
          if (distToPlayer > 2) {
            // Dim: multiply by 0.6
            const r = ((color >> 16) & 0xff) * 0.6;
            const gC = ((color >> 8) & 0xff) * 0.6;
            const b = (color & 0xff) * 0.6;
            color = (Math.floor(r) << 16) | (Math.floor(gC) << 8) | Math.floor(b);
          }
        }

        // Calculate screen position
        const screenX = (x - this.offsetX) * this.tileSize * this.zoom + screenWidth / 2;
        const screenY = (y - this.offsetY) * this.tileSize * this.zoom + screenHeight / 2;

        g.beginFill(color);
        g.drawRect(
          screenX,
          screenY,
          this.tileSize * this.zoom,
          this.tileSize * this.zoom
        );
        g.endFill();

        // Settlement marker
        if (tile.settlement && tile.explored) {
          g.beginFill(0xffff00);
          g.drawRect(
            screenX + (this.tileSize * this.zoom) * 0.3,
            screenY + (this.tileSize * this.zoom) * 0.3,
            (this.tileSize * this.zoom) * 0.4,
            (this.tileSize * this.zoom) * 0.4
          );
          g.endFill();
        }

        // Border for explored tiles
        if (tile.explored) {
          g.lineStyle(1, 0x222222, 0.3);
          g.drawRect(screenX, screenY, this.tileSize * this.zoom, this.tileSize * this.zoom);
        }

        this.tileContainer.addChild(g);
      }
    }

    // Draw player
    const playerScreenX = (pos.x - this.offsetX) * this.tileSize * this.zoom + screenWidth / 2;
    const playerScreenY = (pos.y - this.offsetY) * this.tileSize * this.zoom + screenHeight / 2;

    const pg = new PIXI.Graphics();
    pg.beginFill(0xffffff);
    pg.drawRect(
      playerScreenX + 2,
      playerScreenY + 2,
      this.tileSize * this.zoom - 4,
      this.tileSize * this.zoom - 4
    );
    pg.endFill();
    pg.lineStyle(2, 0xffff00, 1);
    pg.drawRect(
      playerScreenX,
      playerScreenY,
      this.tileSize * this.zoom,
      this.tileSize * this.zoom
    );
    this.tileContainer.addChild(pg);
  }

  centerOn(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  pan(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
  }

  destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }
    this.tileGraphics.clear();
    this.initialized = false;
  }
}
