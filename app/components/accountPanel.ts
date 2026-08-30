import { PlatformApiError } from "../services/platformApi";
import { levelProgressStore } from "../services/levelProgressStore";
import { platformSession, type PlatformSessionState } from "../services/platformSession";

export function accountPanelMarkup(): string {
  return `<div class="account-panel">
    <button class="account-trigger" type="button" aria-haspopup="dialog">
      <span class="account-initial" aria-hidden="true">?</span>
      <span class="account-trigger-copy"><small>DRYGON account</small><strong>Guest player</strong></span>
    </button>
    <dialog class="account-dialog" aria-labelledby="account-dialog-title">
      <div class="account-dialog-card">
        <button class="account-close" type="button" aria-label="Close account panel">&times;</button>
        <div class="account-guest-view">
          <p class="eyebrow">One account, every game</p>
          <h2 id="account-dialog-title">Keep your puzzles with you.</h2>
          <p class="account-intro">Sign in to connect this Huzzle session to your DRYGON profile. Guest play stays available.</p>
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
          <p class="eyebrow">Huzzle connected</p>
          <h2 class="account-user-name"></h2>
          <p>Your Huzzle game profile is active for this browser session.</p>
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
  private readonly triggerName: HTMLElement;
  private readonly dialog: HTMLDialogElement;
  private readonly guestView: HTMLElement;
  private readonly userView: HTMLElement;
  private readonly userInitial: HTMLElement;
  private readonly userName: HTMLElement;
  private readonly loginForm: HTMLFormElement;
  private readonly registerForm: HTMLFormElement;
  private readonly message: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly logoutButton: HTMLButtonElement;
  private readonly tabs: HTMLButtonElement[];
  private readonly unsubscribe: () => void;

  constructor(root: ParentNode, private readonly onProgressSynced?: () => void) {
    this.trigger = this.requireElement(root, ".account-trigger");
    this.triggerInitial = this.requireElement(root, ".account-initial");
    this.triggerName = this.requireElement(root, ".account-trigger-copy strong");
    this.dialog = this.requireElement(root, ".account-dialog");
    this.guestView = this.requireElement(root, ".account-guest-view");
    this.userView = this.requireElement(root, ".account-user-view");
    this.userInitial = this.requireElement(root, ".account-user-initial");
    this.userName = this.requireElement(root, ".account-user-name");
    this.loginForm = this.requireElement(root, ".account-login-form");
    this.registerForm = this.requireElement(root, ".account-register-form");
    this.message = this.requireElement(root, ".account-message");
    this.closeButton = this.requireElement(root, ".account-close");
    this.logoutButton = this.requireElement(root, ".account-logout");
    this.tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".account-tab"));

    this.trigger.addEventListener("click", this.open);
    this.closeButton.addEventListener("click", this.close);
    this.loginForm.addEventListener("submit", this.login);
    this.registerForm.addEventListener("submit", this.register);
    this.logoutButton.addEventListener("click", this.logout);
    this.tabs.forEach((tab) => tab.addEventListener("click", this.switchMode));
    this.unsubscribe = platformSession.subscribe(this.render);
  }

  private requireElement<ElementType extends Element>(root: ParentNode, selector: string): ElementType {
    const element = root.querySelector<ElementType>(selector);
    if (!element) throw new Error(`Missing account panel element: ${selector}`);
    return element;
  }

  private open = () => {
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
      const progressSynced = await levelProgressStore.syncAuthenticated()
        .then(() => true)
        .catch(() => false);
      if (progressSynced) this.onProgressSynced?.();
      this.loginForm.reset();
      this.message.textContent = progressSynced
        ? "Huzzle is connected and your progress is synced."
        : "Huzzle is connected. Local progress will sync when the server is available.";
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
    await platformSession.signOut();
    this.logoutButton.disabled = false;
    this.message.textContent = "Signed out. You can keep playing as a guest.";
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

  private render = (state: PlatformSessionState) => {
    const authenticated = state.status === "authenticated" && state.user;
    const name = authenticated ? state.user!.username : state.status === "restoring" ? "Connecting..." : "Guest player";
    const initial = authenticated ? state.user!.username.charAt(0).toUpperCase() : state.status === "restoring" ? "..." : "?";

    this.triggerName.textContent = name;
    this.triggerInitial.textContent = initial;
    this.trigger.disabled = state.status === "restoring";
    this.guestView.hidden = Boolean(authenticated);
    this.userView.hidden = !authenticated;
    if (authenticated) {
      this.userInitial.textContent = initial;
      this.userName.textContent = state.user!.username;
    }
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
