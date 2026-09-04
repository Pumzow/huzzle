import {
  platformApi,
  PlatformApiError,
  type HuzzleLeaderboardEntry,
  type HuzzleLeaderboardPeriod,
} from "../services/platformApi";
import { platformSession, type PlatformSessionState } from "../services/platformSession";
import { gameConfig } from "../config/gameConfig";
import { Utils } from "../utils/utils";

export function leaderboardPanelMarkup(): string {
  return `<div class="leaderboard-panel">
    <button class="account-trigger leaderboard-trigger" type="button" aria-haspopup="dialog">
      <span class="account-initial" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 11v5M8 20h8M9 16h6v4H9z"/></svg></span>
      <span class="account-trigger-copy"><small>Weekly standings</small><strong>Leaderboard</strong></span>
    </button>
    <dialog class="panel-dialog leaderboard-dialog" aria-label="Huzzle leaderboard">
      <div class="panel-dialog-card">
        <button class="panel-close" type="button" aria-label="Close leaderboard">&times;</button>
        <div class="leaderboard-heading">
          <div><p class="eyebrow">Huzzle standings</p><h2>Leaderboard</h2></div>
        </div>
        <div class="leaderboard-tabs" role="tablist" aria-label="Leaderboard period">
          <button class="leaderboard-tab is-active" type="button" role="tab" data-period="weekly" aria-selected="true">This week</button>
          <button class="leaderboard-tab" type="button" role="tab" data-period="all-time" aria-selected="false">All time</button>
        </div>
        <p class="leaderboard-session">Playing as <strong class="leaderboard-user-name"></strong></p>
        <p class="leaderboard-loading" role="status">Loading leaderboard...</p>
        <ol class="leaderboard-list" aria-label="Huzzle player rankings"></ol>
        <p class="leaderboard-empty" hidden>No Huzzle players yet.</p>
      </div>
    </dialog>
  </div>`;
}

export class LeaderboardPanel {
  private readonly trigger: HTMLButtonElement;
  private readonly dialog: HTMLDialogElement;
  private readonly userName: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly loading: HTMLElement;
  private readonly list: HTMLOListElement;
  private readonly empty: HTMLElement;
  private readonly tabs: HTMLButtonElement[];
  private readonly unsubscribe: () => void;
  private request = 0;
  private period: HuzzleLeaderboardPeriod = "weekly";

  constructor(root: ParentNode, private readonly openAccount: () => void) {
    this.trigger = this.requireElement(root, ".leaderboard-trigger");
    this.dialog = this.requireElement(root, ".leaderboard-dialog");
    this.userName = this.requireElement(root, ".leaderboard-user-name");
    this.closeButton = this.requireElement(root, ".leaderboard-dialog .panel-close");
    this.loading = this.requireElement(root, ".leaderboard-loading");
    this.list = this.requireElement(root, ".leaderboard-list");
    this.empty = this.requireElement(root, ".leaderboard-empty");
    this.tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".leaderboard-tab"));

    this.trigger.addEventListener("click", this.open);
    this.closeButton.addEventListener("click", this.close);
    this.tabs.forEach((tab) => tab.addEventListener("click", this.switchPeriod));
    this.unsubscribe = platformSession.subscribe(this.renderSession);
  }

  private requireElement<ElementType extends Element>(root: ParentNode, selector: string): ElementType {
    const element = root.querySelector<ElementType>(selector);
    if (!element) throw new Error(`Missing leaderboard panel element: ${selector}`);
    return element;
  }

  open = () => {
    if (!platformSession.authenticationToken) {
      this.openAccount();
      return;
    }
    this.dialog.showModal();
    void this.load();
  };

  private close = () => this.dialog.close();

  private switchPeriod = (event: Event) => {
    const period = (event.currentTarget as HTMLButtonElement).dataset.period as HuzzleLeaderboardPeriod;
    if (period === this.period) return;
    this.period = period;
    this.tabs.forEach((tab) => {
      const active = tab.dataset.period === period;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    void this.load();
  };

  private async load(): Promise<void> {
    const token = platformSession.authenticationToken;
    if (!token) return;
    const request = ++this.request;
    this.loading.hidden = false;
    this.loading.textContent = "Loading leaderboard...";
    this.list.replaceChildren();
    this.empty.hidden = true;

    try {
      const entries = await platformApi.getHuzzleLeaderboard(token, this.period);
      if (request !== this.request) return;
      this.renderEntries(entries, platformSession.state.user?.id ?? null);
    } catch (error) {
      if (request !== this.request) return;
      this.loading.textContent = error instanceof PlatformApiError
        ? error.message
        : "Could not load the leaderboard.";
    }
  }

  private renderEntries(entries: HuzzleLeaderboardEntry[], currentPlayerId: string | null): void {
    this.loading.hidden = true;
    this.empty.hidden = entries.length > 0;
    const rows = entries.map((entry, index) => {
      const row = document.createElement("li");
      row.className = "leaderboard-row";
      const staggerIndex = Math.min(index, gameConfig.visualEffects.leaderboard.maximumStaggeredRows);
      row.style.setProperty(
        "--leaderboard-row-delay",
        Utils.toCssSeconds(staggerIndex * gameConfig.visualEffects.leaderboard.rowStagger),
      );
      if (entry.playerId === currentPlayerId) row.classList.add("is-current");
      if (entry.isCheater) row.classList.add("is-cheater");

      const rank = document.createElement("span");
      rank.className = "leaderboard-rank";
      rank.textContent = `#${entry.rank}`;

      const identity = document.createElement("span");
      identity.className = "leaderboard-player";
      const name = document.createElement("strong");
      name.textContent = entry.username;
      identity.append(name);
      if (entry.playerId === currentPlayerId) {
        const you = document.createElement("small");
        you.textContent = "You";
        identity.append(you);
      }

      const points = document.createElement("strong");
      points.className = "leaderboard-points";
      points.classList.toggle("is-cheater", entry.isCheater);
      points.textContent = entry.isCheater ? "CHEATER" : entry.points.toLocaleString();
      points.setAttribute(
        "aria-label",
        entry.isCheater ? `${entry.username} is marked as a cheater` : `${entry.points.toLocaleString()} points`,
      );
      row.append(rank, identity, points);
      return row;
    });
    this.list.replaceChildren(...rows);
  }

  private renderSession = (state: PlatformSessionState) => {
    const authenticated = state.status === "authenticated" && state.user;
    this.trigger.disabled = state.status === "restoring";
    if (authenticated) this.userName.textContent = state.user!.username;
    if (!authenticated) {
      this.request += 1;
      this.list.replaceChildren();
      if (this.dialog.open) this.dialog.close();
    }
  };

  destroy(): void {
    this.request += 1;
    this.unsubscribe();
    this.trigger.removeEventListener("click", this.open);
    this.closeButton.removeEventListener("click", this.close);
    this.tabs.forEach((tab) => tab.removeEventListener("click", this.switchPeriod));
    if (this.dialog.open) this.dialog.close();
  }
}
