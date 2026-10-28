import { Container } from "pixi.js";
import { gsap } from "gsap";
import { gameConfig } from "../../config/gameConfig";
import type { PuzzleBoardGeometry } from "./puzzleBoardGeometry";
import type { PuzzleTile } from "./puzzleBoardTypes";

export class PuzzleBoardEffects {
  private readonly activeTweens = new Set<gsap.core.Tween>();
  private readonly tileTweens = new Map<PuzzleTile, gsap.core.Tween>();
  private readonly connectionTweens = new Map<PuzzleTile, gsap.core.Tween>();
  private readonly connectionPulseGroups = new Map<PuzzleTile, Set<PuzzleTile>>();
  private readonly reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  constructor(
    private readonly geometry: PuzzleBoardGeometry,
    private readonly dragOutlineLayer: Container,
  ) {}

  setTileTransform(tile: PuzzleTile, x: number, y: number, scale = 1): void {
    tile.view.position.set(x, y);
    tile.view.scale.set(scale);
    if (tile.outline.parent !== tile.view) {
      tile.outline.position.set(x, y);
      tile.outline.scale.set(scale);
    }
    tile.connectionOutline.position.set(x, y);
    tile.connectionOutline.scale.set(scale);
  }

  moveOutlineToDragLayer(tile: PuzzleTile): void {
    tile.outline.position.copyFrom(tile.view.position);
    tile.outline.scale.copyFrom(tile.view.scale);
    this.dragOutlineLayer.addChild(tile.outline);
  }

  attachOutlineToTile(tile: PuzzleTile): void {
    tile.outline.position.set(0, 0);
    tile.outline.scale.set(1);
    tile.view.addChild(tile.outline);
  }

  stopTileMotion(tile: PuzzleTile): void {
    const oldTween = this.tileTweens.get(tile);
    if (!oldTween) return;
    oldTween.kill();
    this.activeTweens.delete(oldTween);
    this.tileTweens.delete(tile);
    const scale = tile.view.scale.x;
    this.setTileTransform(
      tile,
      tile.view.x + (this.geometry.tileWidth * (scale - 1)) / 2,
      tile.view.y + (this.geometry.tileHeight * (scale - 1)) / 2,
    );
  }

  moveTilesToSlots(
    members: PuzzleTile[],
    animate = true,
    onMemberSettled?: (tile: PuzzleTile) => void,
  ): void {
    const states = members.map((tile) => {
      this.stopTileMotion(tile);
      const currentScale = tile.view.scale.x;
      const from = {
        x: tile.view.x + (this.geometry.tileWidth * (currentScale - 1)) / 2,
        y: tile.view.y + (this.geometry.tileHeight * (currentScale - 1)) / 2,
      };
      this.setTileTransform(tile, from.x, from.y);
      return { tile, from, target: this.geometry.slotPosition(tile.slot) };
    });
    if (!animate || this.reduceMotion) {
      states.forEach(({ tile, target }) => {
        this.setTileTransform(tile, target.x, target.y);
        onMemberSettled?.(tile);
      });
      return;
    }

    const centerFor = (positions: Array<{ x: number; y: number }>) => ({
      x:
        (Math.min(...positions.map(({ x }) => x)) +
          Math.max(
            ...positions.map(({ x }) => x + this.geometry.tileWidth),
          )) /
        2,
      y:
        (Math.min(...positions.map(({ y }) => y)) +
          Math.max(
            ...positions.map(({ y }) => y + this.geometry.tileHeight),
          )) /
        2,
    });
    const fromCenter = centerFor(states.map(({ from }) => from));
    const targetCenter = centerFor(states.map(({ target }) => target));
    const effect = gameConfig.visualEffects.tileSettle;
    const motion = { progress: 0 };
    const tween = gsap.to(motion, {
      duration: effect.duration,
      ease: "none",
      progress: 1,
      onUpdate: () => {
        const raw = motion.progress;
        const eased = 1 - Math.pow(1 - raw, effect.easingPower);
        const settleScale = 1 + Math.sin(raw * Math.PI) * (effect.peakScale - 1);
        const center = {
          x: fromCenter.x + (targetCenter.x - fromCenter.x) * eased,
          y: fromCenter.y + (targetCenter.y - fromCenter.y) * eased,
        };
        states.forEach(({ tile, from, target }) => {
          const x = from.x + (target.x - from.x) * eased;
          const y = from.y + (target.y - from.y) * eased;
          this.setTileTransform(
            tile,
            center.x + (x - center.x) * settleScale,
            center.y + (y - center.y) * settleScale,
            settleScale,
          );
        });
      },
      onComplete: () => {
        this.activeTweens.delete(tween);
        states.forEach(({ tile, target }) => {
          this.setTileTransform(tile, target.x, target.y);
          this.tileTweens.delete(tile);
          onMemberSettled?.(tile);
        });
      },
    });
    this.activeTweens.add(tween);
    members.forEach((tile) => this.tileTweens.set(tile, tween));
  }

  moveToSlot(
    tile: PuzzleTile,
    animate = true,
    onSettled?: () => void,
  ): void {
    this.moveTilesToSlots([tile], animate, onSettled);
  }

  stopConnectionPulsesFor(members: Iterable<PuzzleTile>): void {
    const pulseGroups = new Set<Set<PuzzleTile>>();
    for (const tile of members) {
      const pulseGroup = this.connectionPulseGroups.get(tile);
      if (pulseGroup) pulseGroups.add(pulseGroup);
    }
    pulseGroups.forEach((pulseGroup) => {
      const stoppedTweens = new Set<gsap.core.Tween>();
      pulseGroup.forEach((tile) => {
        const tween = this.connectionTweens.get(tile);
        if (tween) stoppedTweens.add(tween);
        this.connectionTweens.delete(tile);
        if (this.connectionPulseGroups.get(tile) === pulseGroup)
          this.connectionPulseGroups.delete(tile);
        tile.connectionOutline.visible = false;
        tile.connectionOutline.tint = 0xffffff;
        tile.connectionOutline.alpha = 1;
      });
      stoppedTweens.forEach((tween) => {
        tween.kill();
        this.activeTweens.delete(tween);
      });
    });
  }

  pulseConnections(members: Set<PuzzleTile>): void {
    if (this.reduceMotion) return;
    this.stopConnectionPulsesFor(members);
    members.forEach((tile) => {
      this.connectionPulseGroups.set(tile, members);
      tile.connectionOutline.visible = true;
    });
    const effect = gameConfig.visualEffects.connection;
    const motion = { progress: 0 };
    const tween = gsap.to(motion, {
      duration: effect.duration,
      ease: "none",
      progress: 1,
      onUpdate: () => {
        const progress = motion.progress;
        members.forEach((tile) => {
          tile.connectionOutline.tint =
            progress < effect.hotPhaseEnd
              ? effect.hotColor
              : progress < effect.glowPhaseEnd
                ? effect.glowColor
                : 0xffffff;
          tile.connectionOutline.alpha =
            effect.minimumAlpha +
            Math.abs(Math.sin(progress * Math.PI * 2)) *
              (1 - effect.minimumAlpha);
        });
      },
      onComplete: () => {
        this.activeTweens.delete(tween);
        members.forEach((tile) => {
          tile.connectionOutline.visible = false;
          tile.connectionOutline.tint = 0xffffff;
          tile.connectionOutline.alpha = 1;
          this.connectionTweens.delete(tile);
          if (this.connectionPulseGroups.get(tile) === members)
            this.connectionPulseGroups.delete(tile);
        });
      },
    });
    this.activeTweens.add(tween);
    members.forEach((tile) => this.connectionTweens.set(tile, tween));
  }

  destroy(): void {
    this.activeTweens.forEach((tween) => tween.kill());
    this.activeTweens.clear();
    this.tileTweens.clear();
    this.connectionTweens.clear();
    this.connectionPulseGroups.clear();
  }
}
