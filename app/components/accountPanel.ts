import { PlatformApiError } from "../services/platformApi";
import { levelProgressStore } from "../services/levelProgressStore";
import { platformSession, type PlatformSessionState } from "../services/platformSession";

export function accountPanelMarkup(): string {
  return `<div class="account-panel">
    <button class="account-profile-trigger" type="button" aria-haspopup="dialog" aria-label="Open account" hidden>
      <span class="account-profile-initial" aria-hidden="true">?</span>
    </button>
    <dialog class="panel-dialog account-dialog" aria-label="DRYGON account">
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
          <span class="account-user-initial" aria-hidden="true"></span>
          <p class="eyebrow">DRYGON account</p>
          <h2 class="account-user-name"></h2>
          <dl class="account-details">
            <div><dt>Player ID</dt><dd class="account-user-id"></dd></div>
            <div><dt>Huzzle profile</dt><dd class="account-profile-id"></dd></div>
            <div><dt>Status</dt><dd><span class="account-connected">Connected</span></dd></div>
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
  private readonly userId: HTMLElement;
  private readonly profileId: HTMLElement;
  private readonly loginForm: HTMLFormElement;
  private readonly registerForm: HTMLFormElement;
  private readonly message: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly logoutButton: HTMLButtonElement;
  private readonly tabs: HTMLButtonElement[];
  private readonly unsubscribe: () => void;

  constructor(root: ParentNode, private readonly onAuthenticated?: () => void) {
    this.trigger = this.requireElement(root, ".account-profile-trigger");
    this.triggerInitial = this.requireElement(root, ".account-profile-initial");
    this.dialog = this.requireElement(root, ".account-dialog");
    this.guestView = this.requireElement(root, ".account-guest-view");
    this.userView = this.requireElement(root, ".account-user-view");
    this.userInitial = this.requireElement(root, ".account-user-initial");
    this.userName = this.requireElement(root, ".account-user-name");
    this.userId = this.requireElement(root, ".account-user-id");
    this.profileId = this.requireElement(root, ".account-profile-id");
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
    this.userId.textContent = state.user!.id;
    this.userId.setAttribute("title", state.user!.id);
    this.profileId.textContent = state.profileId ?? "Not connected";
    this.profileId.setAttribute("title", state.profileId ?? "Not connected");
  };

  destroy(): void {
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
