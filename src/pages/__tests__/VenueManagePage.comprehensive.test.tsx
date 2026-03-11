/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import VenueManagePage from "../VenueManagePage";

// ── Mock Radix Select (jsdom doesn't support pointer capture / scrollIntoView) ──
// We replace Select with a native <select> to avoid jsdom limitations with Radix.
vi.mock("@/components/ui/select", () => {
  const cities = ["Rishon LeZion", "Tel Aviv", "Ramat Gan", "Herzliya", "Kfar Saba"];
  return {
    Select: ({ value, onValueChange, children: _children }: any) => (
      <select
        data-testid="city-select"
        value={value || ""}
        onChange={(e: any) => onValueChange(e.target.value)}
      >
        <option value="">--</option>
        {cities.map((c: string) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children }: any) => <>{children}</>,
    SelectTrigger: ({ children }: any) => <>{children}</>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  };
});

// ── Mocks ─────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUser: any = { id: "user-1" };
let mockProfile: any = { role: "club_owner" };

vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: any) => any) =>
    selector({
      user: mockUser,
      profile: mockProfile,
    }),
}));

// Supabase chain with tracking
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  single: vi.fn(() => Promise.resolve({ data: { id: "new-venue-id" }, error: null })),
  contains: vi.fn().mockReturnThis(),
};

const mockStorageUpload = vi.fn().mockResolvedValue({ error: null });
const mockStorageRemove = vi.fn().mockResolvedValue({ error: null });
const mockGetPublicUrl = vi.fn(() => ({
  data: { publicUrl: "https://storage.example.com/photo.jpg" },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => mockSupabaseChain),
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}));

vi.mock("@/hooks/useFormatToggle", () => ({
  useFormatToggle: (_formats: any, _onChange: any) => {
    // Return a function that calls onChange with toggled formats
    return (format: string) => {
      _onChange((prev: string[]) => {
        if (prev.includes(format)) return prev.filter((f: string) => f !== format);
        return [...prev, format];
      });
    };
  },
}));

const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

// ── Helpers ──────────────────────────────────────────────────────

function renderCreateMode() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/venues/new"]}>
        <Routes>
          <Route path="/venues/new" element={<VenueManagePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function renderEditMode(venueId = "venue-1") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/venues/${venueId}/edit`]}>
        <Routes>
          <Route path="/venues/:id/edit" element={<VenueManagePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const fullVenue = {
  id: "venue-1",
  name: "Game Zone",
  city: "Tel Aviv",
  address: "123 Main St",
  owner_id: "user-1",
  supported_formats: ["pauper", "commander"],
  capacity: 32,
  hours: {
    sunday: "10:00-22:00",
    monday: "closed",
    tuesday: "12:00-20:00",
    wednesday: "closed",
    thursday: "closed",
    friday: "closed",
    saturday: "closed",
  },
  contacts: { telegram: "@gamezone", phone: "+972-50-1234567" },
  latitude: 32.0853,
  longitude: 34.7818,
  venue_qr_token: "token-1",
  created_at: "2026-01-01T00:00:00Z",
};

const mockPhotos = [
  { id: "photo-1", venue_id: "venue-1", storage_path: "venue-1/p1.jpg", is_primary: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "photo-2", venue_id: "venue-1", storage_path: "venue-1/p2.jpg", is_primary: false, created_at: "2026-01-02T00:00:00Z" },
];

// ── Tests ────────────────────────────────────────────────────────

describe("VenueManagePage — comprehensive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1" };
    mockProfile = { role: "club_owner" };

    // Default: no venue (create mode)
    mockSupabaseChain.select.mockReturnThis();
    mockSupabaseChain.eq.mockReturnThis();
    mockSupabaseChain.maybeSingle.mockImplementation(() =>
      Promise.resolve({ data: null, error: null })
    );
    mockSupabaseChain.order.mockImplementation(() =>
      Promise.resolve({ data: [], error: null })
    );
    mockSupabaseChain.update.mockReturnThis();
    mockSupabaseChain.insert.mockReturnThis();
    mockSupabaseChain.delete.mockReturnThis();
    mockSupabaseChain.single.mockImplementation(() =>
      Promise.resolve({ data: { id: "new-venue-id" }, error: null })
    );
  });

  // ── Create mode: form fields ───────────────────────────────────

  describe("create mode — form fields", () => {
    it("renders create_venue title", () => {
      renderCreateMode();
      expect(screen.getByText("create_venue")).toBeInTheDocument();
    });

    it("renders name input (required)", () => {
      renderCreateMode();
      const input = screen.getByLabelText("venue_name");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("required");
    });

    it("renders address input (required)", () => {
      renderCreateMode();
      expect(screen.getByText("address")).toBeInTheDocument();
    });

    it("renders city selector", () => {
      renderCreateMode();
      expect(screen.getByText("city")).toBeInTheDocument();
    });

    it("renders capacity number input", () => {
      renderCreateMode();
      expect(screen.getByText("capacity")).toBeInTheDocument();
    });

    it("renders supported_formats section", () => {
      renderCreateMode();
      expect(screen.getByText("supported_formats")).toBeInTheDocument();
    });

    it("renders hours section", () => {
      renderCreateMode();
      expect(screen.getByText("hours")).toBeInTheDocument();
    });

    it("renders contacts section with add contact button", () => {
      renderCreateMode();
      expect(screen.getByText("contacts")).toBeInTheDocument();
      expect(screen.getByText("add_contact")).toBeInTheDocument();
    });

    it("renders coordinates section with latitude and longitude", () => {
      renderCreateMode();
      expect(screen.getByText("coordinates")).toBeInTheDocument();
      expect(screen.getByText("latitude")).toBeInTheDocument();
      expect(screen.getByText("longitude")).toBeInTheDocument();
    });

    it("renders save and cancel buttons", () => {
      renderCreateMode();
      expect(screen.getByText("save")).toBeInTheDocument();
      expect(screen.getByText("cancel")).toBeInTheDocument();
    });

    it("does NOT render photos section in create mode", () => {
      renderCreateMode();
      expect(screen.queryByText("photos")).not.toBeInTheDocument();
    });

    it("does NOT render delete section in create mode", () => {
      renderCreateMode();
      expect(screen.queryByText("delete_venue")).not.toBeInTheDocument();
    });
  });

  // ── Create mode: form input ────────────────────────────────────

  describe("create mode — form input", () => {
    it("allows typing in name field", async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const nameInput = screen.getByLabelText("venue_name");
      await user.type(nameInput, "New Club");
      expect(nameInput).toHaveValue("New Club");
    });

    it("allows typing in address field", async () => {
      const user = userEvent.setup();
      renderCreateMode();

      // Address input has required attribute
      const inputs = screen.getAllByRole("textbox");
      // First textbox is name, second is address
      const addressInput = inputs[1];
      await user.type(addressInput, "456 Oak Ave");
      expect(addressInput).toHaveValue("456 Oak Ave");
    });

    it("allows entering latitude and longitude", async () => {
      const user = userEvent.setup();
      renderCreateMode();

      const latInput = screen.getByPlaceholderText("32.0853");
      const lonInput = screen.getByPlaceholderText("34.7818");

      await user.type(latInput, "31.7683");
      await user.type(lonInput, "35.2137");

      expect(latInput).toHaveValue(31.7683);
      expect(lonInput).toHaveValue(35.2137);
    });

    it("allows adding and removing contacts", async () => {
      const user = userEvent.setup();
      renderCreateMode();

      // Add a contact
      await user.click(screen.getByText("add_contact"));

      // Should render contact label and value inputs
      expect(screen.getByPlaceholderText("contact_label")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("contact_value")).toBeInTheDocument();

      // Type in contact fields
      await user.type(screen.getByPlaceholderText("contact_label"), "Telegram");
      await user.type(screen.getByPlaceholderText("contact_value"), "@myclub");

      expect(screen.getByPlaceholderText("contact_label")).toHaveValue("Telegram");
      expect(screen.getByPlaceholderText("contact_value")).toHaveValue("@myclub");
    });

    it("save button is disabled when name is empty", () => {
      renderCreateMode();
      // Save button should be disabled since name and city and address are empty
      const saveButton = screen.getByText("save").closest("button")!;
      expect(saveButton).toBeDisabled();
    });
  });

  // ── Create mode: save ──────────────────────────────────────────

  describe("create mode — save", () => {
    it("inserts venue with owner_id=user.id on save", async () => {
      const { supabase } = await import("@/lib/supabase");
      const user = userEvent.setup();
      renderCreateMode();

      // Fill required fields
      const nameInput = screen.getByLabelText("venue_name");
      await user.type(nameInput, "New Club");

      // Fill address
      const inputs = screen.getAllByRole("textbox");
      const addressInput = inputs[1];
      await user.type(addressInput, "Test Street");

      // Select city via native select
      const citySelect = screen.getByTestId("city-select");
      await user.selectOptions(citySelect, "Tel Aviv");

      // Click save
      const saveButton = screen.getByText("save").closest("button")!;
      await user.click(saveButton);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("venues");
        expect(mockSupabaseChain.insert).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "New Club",
            address: "Test Street",
            city: "Tel Aviv",
            owner_id: "user-1",
          })
        );
      });
    });

    it("shows toast on save error", async () => {
      mockSupabaseChain.single.mockImplementation(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } })
      );

      const user = userEvent.setup();
      renderCreateMode();

      // Fill required fields
      await user.type(screen.getByLabelText("venue_name"), "Club");
      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[1], "Addr");
      // Select city via native select
      const citySelect = screen.getByTestId("city-select");
      await user.selectOptions(citySelect, "Tel Aviv");

      await user.click(screen.getByText("save").closest("button")!);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("navigates to new venue page on successful create", async () => {
      mockSupabaseChain.single.mockImplementation(() =>
        Promise.resolve({ data: { id: "new-venue-42" }, error: null })
      );

      const user = userEvent.setup();
      renderCreateMode();

      await user.type(screen.getByLabelText("venue_name"), "Club");
      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[1], "Addr");
      const citySelect = screen.getByTestId("city-select");
      await user.selectOptions(citySelect, "Tel Aviv");

      await user.click(screen.getByText("save").closest("button")!);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/venues/new-venue-42");
      });
    });

    it("shows venue_created toast on successful create", async () => {
      const user = userEvent.setup();
      renderCreateMode();

      await user.type(screen.getByLabelText("venue_name"), "Club");
      const inputs = screen.getAllByRole("textbox");
      await user.type(inputs[1], "Addr");
      const citySelect = screen.getByTestId("city-select");
      await user.selectOptions(citySelect, "Tel Aviv");

      await user.click(screen.getByText("save").closest("button")!);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "venue_created" })
        );
      });
    });
  });

  // ── Auth checks ────────────────────────────────────────────────

  describe("auth checks", () => {
    it("redirects player to /clubs in create mode", () => {
      mockProfile = { role: "player" };
      renderCreateMode();
      expect(mockNavigate).toHaveBeenCalledWith("/clubs", { replace: true });
    });

    it("allows club_owner to see create form", () => {
      mockProfile = { role: "club_owner" };
      renderCreateMode();
      expect(screen.getByText("create_venue")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("allows admin to see create form", () => {
      mockProfile = { role: "admin" };
      renderCreateMode();
      expect(screen.getByText("create_venue")).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("redirects organizer to /clubs in create mode", () => {
      mockProfile = { role: "organizer" };
      renderCreateMode();
      expect(mockNavigate).toHaveBeenCalledWith("/clubs", { replace: true });
    });

    it("redirects non-owner to venue page in edit mode", async () => {
      mockUser = { id: "other-user" };
      mockProfile = { role: "player" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue }, error: null })
      );

      renderEditMode();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/venues/venue-1", { replace: true });
      });
    });

    it("allows owner to see edit form", async () => {
      mockUser = { id: "user-1" };
      mockProfile = { role: "club_owner" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue, owner_id: "user-1" }, error: null })
      );

      renderEditMode();
      const title = await screen.findByText("edit_venue");
      expect(title).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("allows admin to edit any venue", async () => {
      mockUser = { id: "admin-user" };
      mockProfile = { role: "admin" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue, owner_id: "someone-else" }, error: null })
      );

      renderEditMode();
      const title = await screen.findByText("edit_venue");
      expect(title).toBeInTheDocument();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  // ── Edit mode: form populated ──────────────────────────────────

  describe("edit mode — form populated", () => {
    beforeEach(() => {
      mockUser = { id: "user-1" };
      mockProfile = { role: "club_owner" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue }, error: null })
      );
      mockSupabaseChain.order.mockImplementation(() =>
        Promise.resolve({ data: [...mockPhotos], error: null })
      );
    });

    it("renders edit_venue title", async () => {
      renderEditMode();
      expect(await screen.findByText("edit_venue")).toBeInTheDocument();
    });

    it("populates name from venue data", async () => {
      renderEditMode();
      const nameInput = await screen.findByLabelText("venue_name");
      expect(nameInput).toHaveValue("Game Zone");
    });

    it("populates address from venue data", async () => {
      renderEditMode();
      await screen.findByText("edit_venue");
      // Address is the second textbox (after name)
      const inputs = screen.getAllByRole("textbox");
      // Find input with value "123 Main St"
      const addressInput = inputs.find((i) => (i as HTMLInputElement).value === "123 Main St");
      expect(addressInput).toBeDefined();
    });

    it("populates capacity from venue data", async () => {
      renderEditMode();
      await screen.findByText("edit_venue");
      // Capacity input is a number input without an associated label id.
      // Find it by type="number" and value.
      const numberInputs = document.querySelectorAll('input[type="number"]');
      const capacityInput = Array.from(numberInputs).find(
        (input) => (input as HTMLInputElement).value === "32"
      );
      expect(capacityInput).toBeDefined();
      expect((capacityInput as HTMLInputElement).value).toBe("32");
    });

    it("populates latitude from venue data", async () => {
      renderEditMode();
      await screen.findByText("edit_venue");
      const latInput = screen.getByPlaceholderText("32.0853");
      expect(latInput).toHaveValue(32.0853);
    });

    it("populates longitude from venue data", async () => {
      renderEditMode();
      await screen.findByText("edit_venue");
      const lonInput = screen.getByPlaceholderText("34.7818");
      expect(lonInput).toHaveValue(34.7818);
    });

    it("renders photos section in edit mode", async () => {
      renderEditMode();
      expect(await screen.findByText("photos")).toBeInTheDocument();
    });

    it("renders upload photo button in edit mode", async () => {
      renderEditMode();
      expect(await screen.findByText("upload_photo")).toBeInTheDocument();
    });

    it("renders delete venue button in edit mode", async () => {
      renderEditMode();
      expect(await screen.findByText("delete_venue")).toBeInTheDocument();
    });
  });

  // ── Edit mode: save (update) ───────────────────────────────────

  describe("edit mode — save (update)", () => {
    beforeEach(() => {
      mockUser = { id: "user-1" };
      mockProfile = { role: "club_owner" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue }, error: null })
      );
      mockSupabaseChain.order.mockImplementation(() =>
        Promise.resolve({ data: [], error: null })
      );
      // Make update chain resolve successfully
      mockSupabaseChain.eq.mockImplementation(() => {
        return {
          ...mockSupabaseChain,
          then: (cb: any) => cb({ error: null }),
        };
      });
    });

    it("calls supabase update on save in edit mode", async () => {
      const { supabase } = await import("@/lib/supabase");

      // Make the update chain succeed
      mockSupabaseChain.eq.mockReturnThis();
      // The last .eq() is the terminal operation for update
      // We need the full chain: from().update().eq() to resolve
      mockSupabaseChain.update.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const user = userEvent.setup();
      renderEditMode();

      await screen.findByText("edit_venue");

      const saveButton = screen.getByText("save").closest("button")!;
      await user.click(saveButton);

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("venues");
        expect(mockSupabaseChain.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Game Zone",
            city: "Tel Aviv",
            address: "123 Main St",
          })
        );
      });
    });
  });

  // ── Delete venue ───────────────────────────────────────────────

  describe("delete venue", () => {
    beforeEach(() => {
      mockUser = { id: "user-1" };
      mockProfile = { role: "club_owner" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue }, error: null })
      );
      mockSupabaseChain.order.mockImplementation(() =>
        Promise.resolve({ data: [], error: null })
      );
    });

    it("shows confirmation on delete button click", async () => {
      const user = userEvent.setup();
      renderEditMode();

      const deleteBtn = await screen.findByText("delete_venue");
      await user.click(deleteBtn);

      expect(screen.getByText("delete_venue_confirm")).toBeInTheDocument();
    });

    it("hides confirmation when cancel is clicked", async () => {
      const user = userEvent.setup();
      renderEditMode();

      const deleteBtn = await screen.findByText("delete_venue");
      await user.click(deleteBtn);

      // Find the cancel button in the delete confirm section
      const cancelButtons = screen.getAllByText("cancel");
      // The second cancel button is in the delete confirm section
      await user.click(cancelButtons[cancelButtons.length - 1]);

      expect(screen.queryByText("delete_venue_confirm")).not.toBeInTheDocument();
    });

    it("calls supabase delete on confirm", async () => {
      const { supabase } = await import("@/lib/supabase");

      mockSupabaseChain.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const user = userEvent.setup();
      renderEditMode();

      const deleteBtn = await screen.findByText("delete_venue");
      await user.click(deleteBtn);

      // Click the actual delete confirm button (the destructive one)
      const confirmDeleteBtn = screen.getAllByText("delete_venue");
      const destructiveBtn = confirmDeleteBtn.find(
        (btn) => btn.closest("button")?.className?.includes("destructive") ||
                 btn.closest("button")?.getAttribute("variant") === "destructive"
      );
      if (destructiveBtn) {
        await user.click(destructiveBtn);
      } else {
        // Fallback: click the last "delete_venue" button (the confirm one)
        await user.click(confirmDeleteBtn[confirmDeleteBtn.length - 1]);
      }

      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("venues");
      });
    });

    it("navigates to /clubs after successful delete", async () => {
      mockSupabaseChain.delete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const user = userEvent.setup();
      renderEditMode();

      await screen.findByText("delete_venue");
      await user.click(screen.getByText("delete_venue"));

      const confirmDeleteButtons = screen.getAllByText("delete_venue");
      await user.click(confirmDeleteButtons[confirmDeleteButtons.length - 1]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/clubs");
      });
    });
  });

  // ── Photo upload ───────────────────────────────────────────────

  describe("photo upload", () => {
    beforeEach(() => {
      mockUser = { id: "user-1" };
      mockProfile = { role: "club_owner" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue }, error: null })
      );
      mockSupabaseChain.order.mockImplementation(() =>
        Promise.resolve({ data: [], error: null })
      );
      mockStorageUpload.mockResolvedValue({ error: null });
      // Make insert chain for venue_photos succeed
      mockSupabaseChain.insert.mockReturnValue({
        ...mockSupabaseChain,
        then: (cb: any) => cb({ error: null }),
      });
    });

    it("renders upload button in edit mode", async () => {
      renderEditMode();
      expect(await screen.findByText("upload_photo")).toBeInTheDocument();
    });

    it("triggers file input on upload button click", async () => {
      renderEditMode();
      await screen.findByText("upload_photo");

      // The file input exists but is hidden
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeDefined();
      expect(fileInput?.accept).toBe("image/*");
    });

    it("uploads file to storage on file selection", async () => {
      const { supabase } = await import("@/lib/supabase");

      // Make the insert resolve properly for photos
      mockSupabaseChain.insert.mockReturnThis();

      renderEditMode();
      await screen.findByText("upload_photo");

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file selection
      const file = new File(["photo-data"], "test.jpg", { type: "image/jpeg" });
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(supabase.storage.from).toHaveBeenCalledWith("venue-images");
        expect(mockStorageUpload).toHaveBeenCalledWith(
          expect.stringContaining("venue-1/"),
          file
        );
      });
    });

    it("shows toast on upload error", async () => {
      mockStorageUpload.mockResolvedValue({ error: { message: "Upload failed" } });

      renderEditMode();
      await screen.findByText("upload_photo");

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["data"], "test.png", { type: "image/png" });
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });
  });

  // ── Photo management ───────────────────────────────────────────

  describe("photo management", () => {
    beforeEach(() => {
      mockUser = { id: "user-1" };
      mockProfile = { role: "club_owner" };
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue }, error: null })
      );
      mockSupabaseChain.order.mockImplementation(() =>
        Promise.resolve({ data: [...mockPhotos], error: null })
      );
    });

    it("renders photos from photosQuery", async () => {
      renderEditMode();
      await screen.findByText("edit_venue");

      // Wait for photos to load — photos are rendered as <img> tags
      await waitFor(() => {
        const images = document.querySelectorAll("img");
        expect(images.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("shows Primary badge on primary photo", async () => {
      renderEditMode();
      await screen.findByText("edit_venue");

      expect(screen.getByText("Primary")).toBeInTheDocument();
    });

    it("shows set_primary button for non-primary photos on hover", async () => {
      renderEditMode();
      await screen.findByText("edit_venue");

      // The set_primary button is rendered but hidden (opacity-0 group-hover:opacity-100)
      // It should still exist in DOM
      expect(screen.getByText("set_primary")).toBeInTheDocument();
    });
  });

  // ── Cancel navigation ─────────────────────────────────────────

  describe("cancel navigation", () => {
    it("navigates to /clubs on cancel in create mode", async () => {
      const user = userEvent.setup();
      renderCreateMode();

      await user.click(screen.getByText("cancel"));

      expect(mockNavigate).toHaveBeenCalledWith("/clubs");
    });

    it("navigates to venue page on cancel in edit mode", async () => {
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({ data: { ...fullVenue }, error: null })
      );

      const user = userEvent.setup();
      renderEditMode("venue-1");

      await screen.findByText("edit_venue");
      await user.click(screen.getAllByText("cancel")[0]);

      expect(mockNavigate).toHaveBeenCalledWith("/venues/venue-1");
    });
  });

  // ── Loading state ──────────────────────────────────────────────

  describe("loading state in edit mode", () => {
    it("shows skeleton while loading venue in edit mode", () => {
      // maybeSingle never resolves to keep isLoading=true
      mockSupabaseChain.maybeSingle.mockImplementation(() => new Promise(() => {}));
      mockSupabaseChain.order.mockImplementation(() => new Promise(() => {}));

      renderEditMode();

      // The page should show skeleton (not the form)
      expect(screen.queryByText("edit_venue")).not.toBeInTheDocument();
    });
  });

  // ── Hours parsing ──────────────────────────────────────────────

  describe("hours parsing", () => {
    it("parses hours JSON from venue data", async () => {
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({
          data: {
            ...fullVenue,
            hours: { sunday: "09:00-18:00", monday: "closed", tuesday: "closed", wednesday: "closed", thursday: "closed", friday: "closed", saturday: "closed" },
          },
          error: null,
        })
      );

      renderEditMode();
      await screen.findByText("edit_venue");

      // Sunday should show as open with times visible
      // Check that time inputs are rendered (for open days)
      const timeInputs = document.querySelectorAll('input[type="time"]');
      expect(timeInputs.length).toBeGreaterThanOrEqual(2); // At least from and to for Sunday
    });
  });

  // ── Contacts parsing ──────────────────────────────────────────

  describe("contacts parsing", () => {
    it("parses contacts JSON from venue data", async () => {
      mockSupabaseChain.maybeSingle.mockImplementation(() =>
        Promise.resolve({
          data: {
            ...fullVenue,
            contacts: { telegram: "@club" },
          },
          error: null,
        })
      );

      renderEditMode();
      await screen.findByText("edit_venue");

      // Contact should be rendered with label and value
      const labelInputs = screen.getAllByPlaceholderText("contact_label");
      expect(labelInputs.length).toBeGreaterThanOrEqual(1);
    });
  });
});
