import {
  closeAnimatedDialog,
  showAnimatedDialog,
} from "../../effects/dialogEffects";
import type { PlayerProgress } from "../../types/progressTypes";
import { requiredElement } from "../../utils/dom";

type AchievementDefinition = {
  name: string;
  description: string;
  metric: "levels" | "points";
  target: number;
};

export type AchievementProgress = AchievementDefinition & {
  current: number;
  unlocked: boolean;
  percentage: number;
};

const achievements: readonly AchievementDefinition[] = [
  { name: "First Connection", description: "Complete your first level.", metric: "levels", target: 1 },
  { name: "Puzzle Apprentice", description: "Complete 5 levels.", metric: "levels", target: 5 },
  { name: "Grid Veteran", description: "Complete 10 levels.", metric: "levels", target: 10 },
  { name: "Puzzle Master", description: "Complete 25 levels.", metric: "levels", target: 25 },
  { name: "Puzzle Expert", description: "Complete 50 levels.", metric: "levels", target: 50 },
  { name: "Century Solver", description: "Complete 100 levels.", metric: "levels", target: 100 },
  { name: "Point Starter", description: "Earn 250 points this week.", metric: "points", target: 250 },
  { name: "Point Builder", description: "Earn 500 points this week.", metric: "points", target: 500 },
  { name: "Point Collector", description: "Earn 1,000 points this week.", metric: "points", target: 1_000 },
  { name: "High Scorer", description: "Earn 2,500 points this week.", metric: "points", target: 2_500 },
  { name: "Point Champion", description: "Earn 5,000 points this week.", metric: "points", target: 5_000 },
  { name: "Score Legend", description: "Earn 10,000 points this week.", metric: "points", target: 10_000 },
];

export function achievementProgress(
  progress: PlayerProgress,
): AchievementProgress[] {
  return achievements.map((achievement) => {
    const current = achievement.metric === "levels"
      ? progress.currentLevel
      : progress.points;
    return {
      ...achievement,
      current,
      unlocked: current >= achievement.target,
      percentage: Math.min(100, Math.round((current / achievement.target) * 100)),
    };
  }).sort((left, right) => {
    const completionOrder = Number(right.unlocked) - Number(left.unlocked);
    return completionOrder || right.percentage - left.percentage;
  });
}

export function achievementsPanelMarkup(): string {
  return `<div class="achievements-panel">
    <button class="menu-secondary-action achievements-trigger" type="button" aria-haspopup="dialog">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 11v5M8 20h8M9 16h6v4H9z"/></svg>
      <span>Achievements</span>
    </button>
    <dialog class="panel-dialog achievements-dialog" aria-labelledby="achievements-title">
      <section class="panel-dialog-card achievements-card">
        <button class="panel-close achievements-close" type="button" aria-label="Close achievements">&times;</button>
        <p class="eyebrow">Your milestones</p>
        <div class="achievements-heading"><h2 id="achievements-title">Achievements</h2><strong data-achievement-total>0 / ${achievements.length}</strong></div>
        <div class="achievements-list"></div>
      </section>
    </dialog>
  </div>`;
}

export class AchievementsPanel {
  private readonly trigger: HTMLButtonElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly dialog: HTMLDialogElement;
  private readonly list: HTMLElement;
  private readonly total: HTMLElement;
  private progress: PlayerProgress = {
    currentLevel: 0,
    points: 0,
    totalPoints: 0,
    isCheater: false,
  };

  constructor(root: ParentNode) {
    this.trigger = requiredElement(root, ".achievements-trigger");
    this.closeButton = requiredElement(root, ".achievements-close");
    this.dialog = requiredElement(root, ".achievements-dialog");
    this.list = requiredElement(root, ".achievements-list");
    this.total = requiredElement(root, "[data-achievement-total]");
    this.trigger.addEventListener("click", this.open);
    this.closeButton.addEventListener("click", this.close);
    this.dialog.addEventListener("click", this.closeFromBackdrop);
    this.render();
  }

  update(progress: PlayerProgress): void {
    this.progress = progress;
    this.render();
  }

  destroy(): void {
    this.trigger.removeEventListener("click", this.open);
    this.closeButton.removeEventListener("click", this.close);
    this.dialog.removeEventListener("click", this.closeFromBackdrop);
  }

  private render(): void {
    const states = achievementProgress(this.progress);
    const unlocked = states.filter((state) => state.unlocked).length;
    this.total.textContent = `${unlocked} / ${states.length}`;
    this.list.innerHTML = states.map((state) => {
      const current = Math.min(state.current, state.target).toLocaleString();
      const target = state.target.toLocaleString();
      return `<article class="achievement-item${state.unlocked ? " is-unlocked" : ""}">
        <span class="achievement-badge" aria-hidden="true">${state.unlocked ? "✓" : "◆"}</span>
        <div class="achievement-copy"><strong>${state.name}</strong><p>${state.description}</p><div class="achievement-progress"><i style="width:${state.percentage}%"></i></div><small>${current} / ${target}</small></div>
      </article>`;
    }).join("");
  }

  private open = () => {
    this.render();
    showAnimatedDialog(this.dialog);
  };

  private close = () => closeAnimatedDialog(this.dialog);

  private closeFromBackdrop = (event: MouseEvent) => {
    if (event.target === this.dialog) this.close();
  };
}
