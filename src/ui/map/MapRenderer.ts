import * as PIXI from 'pixi.js';
import type { GameState } from '../../core/state/GameState';
import { TERRAIN_COLOR } from '../../core/world/TerrainType';
import type { PositionComponent } from '../../core/ecs/Component';
import { TILE_SIZE, VIEWPORT_WIDTH, VIEWPORT_HEIGHT } from '../../core/world/Tile';

/**
 * High-performance WebGL map viewport renderer using PixiJS.
 * Features persistent graphics layering, viewport culling, smooth pan/zoom, and player tracking.
 */
export class MapRenderer {
  private app: PIXI.Application;
  private container: HTMLElement;
  private rootContainer: PIXI.Container;

  // Persistent graphics layers to prevent WebGL object churn & memory allocation
  private tileLayer: PIXI.Graphics;
  private borderLayer: PIXI.Graphics;
  private settlementLayer: PIXI.Graphics;
  private playerGraphics: PIXI.Graphics;

  private tileSize: number = TILE_SIZE;
  private viewportWidth: number = VIEWPORT_WIDTH;
  private viewportHeight: number = VIEWPORT_HEIGHT;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isDragging: boolean = false;
  private lastDragPos: { x: number; y: number } | null = null;
  private zoom: number = 1;
  private initialized: boolean = false;
  private resizeListener: () => void;
  private mouseUpListener: () => void;
  private mouseMoveListener: (e: MouseEvent) => void;

  /**
   * @param container DOM element hosting the PixiJS canvas
   * @param mapWidth Map width in tiles
   * @param mapHeight Map height in tiles
   */
  constructor(container: HTMLElement, mapWidth: number, mapHeight: number) {
    this.container = container;
    this.rootContainer = new PIXI.Container();

    this.tileLayer = new PIXI.Graphics();
    this.borderLayer = new PIXI.Graphics();
    this.settlementLayer = new PIXI.Graphics();
    this.playerGraphics = new PIXI.Graphics();

    this.app = new PIXI.Application({
      width: container.clientWidth || 800,
      height: container.clientHeight || 600,
      backgroundColor: 0x000000,
      antialias: false,
      resolution: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      autoDensity: true,
    });

    this.resizeListener = () => this.handleResize();
    this.mouseUpListener = () => {
      this.isDragging = false;
      this.lastDragPos = null;
      if (this.app?.view && 'style' in this.app.view) {
        (this.app.view as HTMLCanvasElement).style.cursor = 'grab';
      }
    };
    this.mouseMoveListener = (e: MouseEvent) => {
      if (!this.isDragging || !this.lastDragPos) return;
      const dx = e.clientX - this.lastDragPos.x;
      const dy = e.clientY - this.lastDragPos.y;
      this.pan(-dx / (this.tileSize * this.zoom), -dy / (this.tileSize * this.zoom));
      this.lastDragPos = { x: e.clientX, y: e.clientY };
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeListener);
    }

    this.offsetX = Math.floor(mapWidth / 2);
    this.offsetY = Math.floor(mapHeight / 2);
  }

  /**
   * Mounts the PixiJS canvas and sets up layer hierarchy and mouse interaction.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.app.view && 'style' in this.app.view) {
      this.container.appendChild(this.app.view as HTMLCanvasElement);
    }

    this.rootContainer.addChild(this.tileLayer);
    this.rootContainer.addChild(this.borderLayer);
    this.rootContainer.addChild(this.settlementLayer);
    this.rootContainer.addChild(this.playerGraphics);
    this.app.stage.addChild(this.rootContainer);

    this.setupInteraction();
    this.initialized = true;
  }

  /**
   * Resizes PixiJS renderer on container size changes.
   */
  private handleResize(): void {
    if (!this.app || !this.container) return;
    this.app.renderer.resize(this.container.clientWidth, this.container.clientHeight);
  }

  /**
   * Attaches pan and zoom interaction listeners to the canvas.
   */
  private setupInteraction(): void {
    const canvas = this.app.view as HTMLCanvasElement;
    if (!canvas || !canvas.addEventListener) return;

    canvas.style.cursor = 'grab';

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastDragPos = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('mouseup', this.mouseUpListener);
      window.addEventListener('mousemove', this.mouseMoveListener);
    }

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      this.zoom = Math.max(0.5, Math.min(2.5, this.zoom + delta));
    });
  }

  /**
   * Renders the visible viewport of world tiles, settlements, borders, and player character.
   * Reuses persistent graphics layers with zero per-turn heap allocations.
   * @param state Current GameState
   */
  render(state: GameState): void {
    if (!this.initialized) return;

    const pos = state.entities.getComponent<PositionComponent>(state.playerId, 'position');
    if (!pos) return;

    // Auto-center camera on player position when not actively dragging
    if (!this.isDragging) {
      this.offsetX = pos.x;
      this.offsetY = pos.y;
    }

    // Clear graphics layers for redrawing
    this.tileLayer.clear();
    this.borderLayer.clear();
    this.settlementLayer.clear();
    this.playerGraphics.clear();

    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    const scaledTileSize = this.tileSize * this.zoom;

    const tilesX = Math.ceil(screenWidth / scaledTileSize) + 2;
    const tilesY = Math.ceil(screenHeight / scaledTileSize) + 2;

    const halfX = Math.floor(tilesX / 2);
    const halfY = Math.floor(tilesY / 2);

    const startX = Math.floor(this.offsetX - halfX);
    const endX = Math.floor(this.offsetX + halfX);
    const startY = Math.floor(this.offsetY - halfY);
    const endY = Math.floor(this.offsetY + halfY);

    // Render visible tiles
    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || x >= state.mapWidth || y < 0 || y >= state.mapHeight) continue;
        const tile = state.map[y][x];

        const screenX = (x - this.offsetX) * scaledTileSize + screenWidth / 2;
        const screenY = (y - this.offsetY) * scaledTileSize + screenHeight / 2;

        let color: number;
        if (!tile.explored) {
          color = 0x000000;
        } else {
          color = TERRAIN_COLOR[tile.terrain];
          // Slight dimming for tiles beyond immediate view distance
          const distToPlayer = Math.max(Math.abs(x - pos.x), Math.abs(y - pos.y));
          if (distToPlayer > 2) {
            const r = ((color >> 16) & 0xff) * 0.6;
            const gC = ((color >> 8) & 0xff) * 0.6;
            const b = (color & 0xff) * 0.6;
            color = (Math.floor(r) << 16) | (Math.floor(gC) << 8) | Math.floor(b);
          }
        }

        this.tileLayer.beginFill(color);
        this.tileLayer.drawRect(screenX, screenY, scaledTileSize, scaledTileSize);
        this.tileLayer.endFill();

        if (tile.explored) {
          // Tile grid border
          this.borderLayer.lineStyle(1, 0x222222, 0.3);
          this.borderLayer.drawRect(screenX, screenY, scaledTileSize, scaledTileSize);

          // Settlement indicator
          if (tile.settlement) {
            this.settlementLayer.beginFill(0xffff00);
            this.settlementLayer.drawRect(
              screenX + scaledTileSize * 0.3,
              screenY + scaledTileSize * 0.3,
              scaledTileSize * 0.4,
              scaledTileSize * 0.4
            );
            this.settlementLayer.endFill();
          }
        }
      }
    }

    // Render player marker
    const playerScreenX = (pos.x - this.offsetX) * scaledTileSize + screenWidth / 2;
    const playerScreenY = (pos.y - this.offsetY) * scaledTileSize + screenHeight / 2;

    this.playerGraphics.beginFill(0xffffff);
    this.playerGraphics.drawRect(
      playerScreenX + 2,
      playerScreenY + 2,
      scaledTileSize - 4,
      scaledTileSize - 4
    );
    this.playerGraphics.endFill();

    this.playerGraphics.lineStyle(2, 0xffff00, 1);
    this.playerGraphics.drawRect(playerScreenX, playerScreenY, scaledTileSize, scaledTileSize);
  }

  /**
   * Centers the camera offset on specified tile coordinates.
   * @param x Tile X coordinate
   * @param y Tile Y coordinate
   */
  centerOn(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  /**
   * Pans the camera offset by relative tile delta.
   * @param dx Delta X in tiles
   * @param dy Delta Y in tiles
   */
  pan(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;
  }

  /**
   * Destroys PixiJS application, graphics, and unbinds all window listeners.
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeListener);
      window.removeEventListener('mouseup', this.mouseUpListener);
      window.removeEventListener('mousemove', this.mouseMoveListener);
    }
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }
    this.initialized = false;
  }
}
