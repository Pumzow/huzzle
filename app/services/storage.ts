export type GameStorageArea = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export class StorageManager {
  get local(): GameStorageArea | null {
    return this.resolve("localStorage");
  }

  get session(): GameStorageArea | null {
    return this.resolve("sessionStorage");
  }

  private resolve(area: "localStorage" | "sessionStorage"): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      return window[area];
    } catch {
      return null;
    }
  }
}

export const storage = new StorageManager();
