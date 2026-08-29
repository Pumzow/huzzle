import { appConfig } from "../config/appConfig";
import { platformApi, type GameEntry, type PlatformUser } from "./platformApi";

type StoredSession = {
  token: string;
  user: PlatformUser;
  profileId: string;
};

export type PlatformSessionState = {
  status: "guest" | "restoring" | "authenticated";
  user: PlatformUser | null;
  profileId: string | null;
};

type SessionListener = (state: PlatformSessionState) => void;

export class PlatformSession {
  private stateValue: PlatformSessionState = {
    status: "guest",
    user: null,
    profileId: null,
  };
  private token: string | null = null;
  private restoreTask: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<SessionListener>();

  get state(): PlatformSessionState {
    return this.stateValue;
  }

  get authenticationToken(): string | null {
    return this.stateValue.status === "authenticated" ? this.token : null;
  }

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    listener(this.stateValue);
    return () => this.listeners.delete(listener);
  }

  restore(): Promise<void> {
    this.restoreTask = this.restoreStoredSession();
    return this.restoreTask;
  }

  whenReady(): Promise<void> {
    return this.restoreTask;
  }

  private async restoreStoredSession(): Promise<void> {
    const stored = this.readStoredSession();
    if (!stored) return;

    this.token = stored.token;
    this.setState({ status: "restoring", user: stored.user, profileId: stored.profileId });

    try {
      const authentication = await platformApi.authenticate(stored.token);
      if (authentication.id !== stored.user.id) throw new Error("Session user mismatch");
      const entry = await platformApi.enterHuzzle(stored.token);
      this.persist(stored.token, stored.user, entry);
    } catch {
      this.clear();
    }
  }

  async signIn(username: string, password: string): Promise<void> {
    const login = await platformApi.login(username, password);
    const user: PlatformUser = {
      id: login.id,
      username: login.username,
      avatar: login.avatar,
    };
    const entry = await platformApi.enterHuzzle(login.token);
    this.persist(login.token, user, entry);
  }

  register(username: string, email: string, password: string): Promise<{ message: string }> {
    return platformApi.register(username, email, password);
  }

  async signOut(): Promise<void> {
    const token = this.token;
    this.clear();
    if (token) await platformApi.logout(token).catch(() => undefined);
  }

  private persist(token: string, user: PlatformUser, entry: GameEntry): void {
    const stored: StoredSession = { token, user, profileId: entry.profile.id };
    this.token = token;
    try {
      sessionStorage.setItem(appConfig.platform.sessionStorageKey, JSON.stringify(stored));
    } catch {
      // The active tab still keeps the authenticated session when storage is unavailable.
    }
    this.setState({ status: "authenticated", user, profileId: entry.profile.id });
  }

  private readStoredSession(): StoredSession | null {
    try {
      const value = sessionStorage.getItem(appConfig.platform.sessionStorageKey);
      if (!value) return null;
      const parsed = JSON.parse(value) as Partial<StoredSession>;
      if (!parsed.token || !parsed.user?.id || !parsed.user.username || !parsed.profileId) return null;
      return parsed as StoredSession;
    } catch {
      return null;
    }
  }

  private clear(): void {
    this.token = null;
    try {
      sessionStorage.removeItem(appConfig.platform.sessionStorageKey);
    } catch {
      // Storage cleanup is best effort; in-memory state is authoritative for this tab.
    }
    this.setState({ status: "guest", user: null, profileId: null });
  }

  private setState(state: PlatformSessionState): void {
    this.stateValue = state;
    this.listeners.forEach((listener) => listener(state));
  }
}

export const platformSession = new PlatformSession();
