import { platformApi, PlatformApiError } from "../services/platformApi";
import { levelProgressStore } from "../services/levelProgressStore";
import { platformSession, type PlatformSessionState } from "../services/platformSession";

export function formatCompactPoints(points: number, locales?: string | string[]): string {
  const normalized = Math.max(0, Math.trunc(points));
  const suffixes = ["", "k", "M", "B"];
  let unit = normalized === 0 ? 0 : Math.min(Math.floor(Math.log10(normalized) / 3), suffixes.length - 1);
  let scaled = normalized / (1000 ** unit);

  if (unit < suffixes.length - 1 && Math.round(scaled * 10) / 10 >= 1000) {
    unit += 1;
    scaled /= 1000;
  }

  return `${scaled.toLocaleString(locales, { maximumFractionDigits: unit === 0 ? 0 : 1 })}${suffixes[unit]}`;
}

export function accountPanelMarkup(): string {
  return `<div class="account-panel">
    <button class="account-profile-trigger" type="button" aria-haspopup="dialog" aria-label="Open account" hidden>
      <span class="account-profile-initial" aria-hidden="true">?</span>
    </button>
    <dialog class="panel-dialog account-dialog" aria-label="Player account">
      <div class="panel-dialog-card">
        <button class="panel-close" type="button" aria-label="Close account panel">&times;</button>
        <div class="account-guest-view">
          <p class="eyebrow">One account, every game</p>
          <h2>Keep your puzzles with you.</h2>
          <p class="account-intro">Sign in to connect this Huzzle session to your DRYGON profile and view the leaderboard. Guest play stays available.</p>
          <div class="account-tabs" role="tablist" aria-label="Account action">
            <button class="account-tab is-active" type="button" role="tab" data-account-mode="login" aria-selected="true">Sign in</button>
            <button class="account-tab" type="button" role="tab" data-account-mode="register" aria-selected="false">Create account</button>
          </div>
          <form class="account-form account-login-form">
            <label>Username<input name="username" autocomplete="username" required></label>
            <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
            <button class="account-submit" type="submit">Sign in &amp; connect</button>
          </form>
          <form class="account-form account-register-form" hidden>
            <label>Username<input name="username" autocomplete="username" required></label>
            <label>Email<input name="email" type="email" autocomplete="email" required></label>
            <label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
            <button class="account-submit" type="submit">Create DRYGON account</button>
          </form>
        </div>
        <div class="account-user-view" hidden>
          <div class="account-user-heading">
            <span class="account-user-initial" aria-hidden="true"></span>
            <h2 class="account-user-name"></h2>
          </div>
          <dl class="account-player-stats">
            <div><dt>Level</dt><dd class="account-player-level">&hellip;</dd></div>
            <div><dt>Points</dt><dd class="account-player-points">&hellip;</dd></div>
            <div><dt>Ranking</dt><dd class="account-player-rank">&hellip;</dd></div>
          </dl>
          <button class="account-logout" type="button">Sign out</button>
        </div>
        <p class="account-message" role="status" aria-live="polite"></p>
      </div>
    </dialog>
  </div>`;
}

export class AccountPanel {
  private readonly trigger: HTMLButtonElement;
  private readonly triggerInitial: HTMLElement;
  private readonly dialog: HTMLDialogElement;
  private readonly guestView: HTMLElement;
  private readonly userView: HTMLElement;
  private readonly userInitial: HTMLElement;
  private readonly userName: HTMLElement;
  private readonly playerLevel: HTMLElement;
  private readonly playerPoints: HTMLElement;
  private readonly playerRank: HTMLElement;
  private readonly loginForm: HTMLFormElement;
  private readonly registerForm: HTMLFormElement;
  private readonly message: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly logoutButton: HTMLButtonElement;
  private readonly tabs: HTMLButtonElement[];
  private readonly unsubscribe: () => void;
  private progressRequest = 0;
  private destroyed = false;

  constructor(root: ParentNode, private readonly onAuthenticated?: () => void) {
    this.trigger = this.requireElement(root, ".account-profile-trigger");
    this.triggerInitial = this.requireElement(root, ".account-profile-initial");
    this.dialog = this.requireElement(root, ".account-dialog");
    this.guestView = this.requireElement(root, ".account-guest-view");
    this.userView = this.requireElement(root, ".account-user-view");
    this.userInitial = this.requireElement(root, ".account-user-initial");
    this.userName = this.requireElement(root, ".account-user-name");
    this.playerLevel = this.requireElement(root, ".account-player-level");
    this.playerPoints = this.requireElement(root, ".account-player-points");
    this.playerRank = this.requireElement(root, ".account-player-rank");
    this.loginForm = this.requireElement(root, ".account-login-form");
    this.registerForm = this.requireElement(root, ".account-register-form");
    this.message = this.requireElement(root, ".account-message");
    this.closeButton = this.requireElement(root, ".account-dialog .panel-close");
    this.logoutButton = this.requireElement(root, ".account-logout");
    this.tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".account-tab"));

    this.trigger.addEventListener("click", this.open);
    this.closeButton.addEventListener("click", this.close);
    this.loginForm.addEventListener("submit", this.login);
    this.registerForm.addEventListener("submit", this.register);
    this.logoutButton.addEventListener("click", this.logout);
    this.tabs.forEach((tab) => tab.addEventListener("click", this.switchMode));
    this.unsubscribe = platformSession.subscribe(this.renderSession);
  }

  private requireElement<ElementType extends Element>(root: ParentNode, selector: string): ElementType {
    const element = root.querySelector<ElementType>(selector);
    if (!element) throw new Error(`Missing account panel element: ${selector}`);
    return element;
  }

  open = () => {
    this.message.textContent = "";
    this.dialog.showModal();
  };

  private close = () => this.dialog.close();

  private switchMode = (event: Event) => {
    const selected = event.currentTarget as HTMLButtonElement;
    const isLogin = selected.dataset.accountMode === "login";
    this.loginForm.hidden = !isLogin;
    this.registerForm.hidden = isLogin;
    this.tabs.forEach((tab) => {
      const active = tab === selected;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    this.message.textContent = "";
  };

  private login = async (event: SubmitEvent) => {
    event.preventDefault();
    const data = new FormData(this.loginForm);
    await this.runForm(this.loginForm, async () => {
      await platformSession.signIn(String(data.get("username") ?? "").trim(), String(data.get("password") ?? ""));
      await levelProgressStore.syncAuthenticated().catch(() => undefined);
      this.loginForm.reset();
      this.close();
      this.onAuthenticated?.();
    });
  };

  private register = async (event: SubmitEvent) => {
    event.preventDefault();
    const data = new FormData(this.registerForm);
    await this.runForm(this.registerForm, async () => {
      const response = await platformSession.register(
        String(data.get("username") ?? "").trim(),
        String(data.get("email") ?? "").trim(),
        String(data.get("password") ?? ""),
      );
      this.registerForm.reset();
      this.message.textContent = response.message;
    });
  };

  private logout = async () => {
    this.logoutButton.disabled = true;
    this.close();
    await platformSession.signOut();
    this.logoutButton.disabled = false;
  };

  private async runForm(form: HTMLFormElement, action: () => Promise<void>): Promise<void> {
    const controls = Array.from(form.elements) as Array<HTMLInputElement | HTMLButtonElement>;
    controls.forEach((control) => { control.disabled = true; });
    this.message.textContent = "Connecting...";
    try {
      await action();
    } catch (error) {
      this.message.textContent = error instanceof PlatformApiError ? error.message : "Something went wrong. Please try again.";
    } finally {
      controls.forEach((control) => { control.disabled = false; });
    }
  }

  private renderSession = (state: PlatformSessionState) => {
    const progressRequest = ++this.progressRequest;
    const authenticated = state.status === "authenticated" && state.user;
    this.trigger.hidden = !authenticated;
    this.guestView.hidden = Boolean(authenticated);
    this.userView.hidden = !authenticated;
    if (!authenticated) return;

    const initial = state.user!.username.charAt(0).toUpperCase();
    this.triggerInitial.textContent = initial;
    this.trigger.setAttribute("aria-label", `Open account for ${state.user!.username}`);
    this.userInitial.textContent = initial;
    this.userName.textContent = state.user!.username;
    this.playerLevel.textContent = "\u2026";
    this.playerPoints.textContent = "\u2026";
    this.playerRank.textContent = "\u2026";
    void this.renderProgress(progressRequest, state.user!.id);
  };

  private async renderProgress(request: number, playerId: string): Promise<void> {
    const token = platformSession.authenticationToken;
    const [progress, leaderboard] = await Promise.all([
      levelProgressStore.load(),
      token ? platformApi.getHuzzleLeaderboard(token).catch(() => null) : Promise.resolve(null),
    ]);
    if (this.destroyed || request !== this.progressRequest) return;
    const rank = leaderboard?.find((entry) => entry.playerId === playerId)?.rank;
    this.playerLevel.textContent = (progress.currentLevel + 1).toLocaleString();
    const fullPoints = progress.points.toLocaleString();
    this.playerPoints.textContent = formatCompactPoints(progress.points);
    this.playerPoints.setAttribute("aria-label", `${fullPoints} points`);
    this.playerPoints.setAttribute("title", `${fullPoints} points`);
    this.playerRank.textContent = rank === undefined ? "UNRANKED" : `TOP #${rank.toLocaleString()}`;
  }

  destroy(): void {
    this.destroyed = true;
    this.progressRequest += 1;
    this.unsubscribe();
    this.trigger.removeEventListener("click", this.open);
    this.closeButton.removeEventListener("click", this.close);
    this.loginForm.removeEventListener("submit", this.login);
    this.registerForm.removeEventListener("submit", this.register);
    this.logoutButton.removeEventListener("click", this.logout);
    this.tabs.forEach((tab) => tab.removeEventListener("click", this.switchMode));
    if (this.dialog.open) this.dialog.close();
  }
}
