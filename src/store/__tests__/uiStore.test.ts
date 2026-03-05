import { useUIStore } from "../uiStore";

describe("useUIStore", () => {
  const initialState = useUIStore.getState();

  afterEach(() => {
    useUIStore.setState(initialState, true);
  });

  it("has correct initial state", () => {
    const state = useUIStore.getState();
    // language defaults from localStorage or "en"
    expect(typeof state.language).toBe("string");
    expect(state.theme).toBe("dark");
    expect(state.sidebarOpen).toBe(false);
    expect(state.notificationsCount).toBe(0);
  });

  describe("setLanguage", () => {
    it("sets language", () => {
      useUIStore.getState().setLanguage("ru");
      expect(useUIStore.getState().language).toBe("ru");
    });

    it("can change language multiple times", () => {
      useUIStore.getState().setLanguage("he");
      useUIStore.getState().setLanguage("en");
      expect(useUIStore.getState().language).toBe("en");
    });
  });

  describe("setSidebarOpen", () => {
    it("sets sidebarOpen to true", () => {
      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().sidebarOpen).toBe(true);
    });

    it("sets sidebarOpen to false", () => {
      useUIStore.getState().setSidebarOpen(true);
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().sidebarOpen).toBe(false);
    });
  });

  describe("setNotificationsCount", () => {
    it("sets notificationsCount", () => {
      useUIStore.getState().setNotificationsCount(5);
      expect(useUIStore.getState().notificationsCount).toBe(5);
    });

    it("sets notificationsCount to 0", () => {
      useUIStore.getState().setNotificationsCount(3);
      useUIStore.getState().setNotificationsCount(0);
      expect(useUIStore.getState().notificationsCount).toBe(0);
    });
  });

  describe("setTheme", () => {
    it("sets theme to dark (the only option)", () => {
      useUIStore.getState().setTheme("dark");
      expect(useUIStore.getState().theme).toBe("dark");
    });
  });
});
