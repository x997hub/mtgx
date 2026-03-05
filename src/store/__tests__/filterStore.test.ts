import { useFilterStore } from "../filterStore";

describe("useFilterStore", () => {
  const initialState = useFilterStore.getState();

  afterEach(() => {
    useFilterStore.setState(initialState, true);
  });

  it("has correct initial state", () => {
    const state = useFilterStore.getState();
    expect(state.format).toBeNull();
    expect(state.city).toBeNull();
  });

  describe("setFormat", () => {
    it("sets format to a specific value", () => {
      useFilterStore.getState().setFormat("pauper");
      expect(useFilterStore.getState().format).toBe("pauper");
    });

    it("sets format to null", () => {
      useFilterStore.getState().setFormat("commander");
      useFilterStore.getState().setFormat(null);
      expect(useFilterStore.getState().format).toBeNull();
    });
  });

  describe("setCity", () => {
    it("sets city to a specific value", () => {
      useFilterStore.getState().setCity("Tel Aviv");
      expect(useFilterStore.getState().city).toBe("Tel Aviv");
    });

    it("sets city to null", () => {
      useFilterStore.getState().setCity("Tel Aviv");
      useFilterStore.getState().setCity(null);
      expect(useFilterStore.getState().city).toBeNull();
    });
  });

  describe("resetFilters", () => {
    it("resets both format and city to null", () => {
      useFilterStore.getState().setFormat("draft");
      useFilterStore.getState().setCity("Herzliya");

      useFilterStore.getState().resetFilters();

      const state = useFilterStore.getState();
      expect(state.format).toBeNull();
      expect(state.city).toBeNull();
    });
  });
});
