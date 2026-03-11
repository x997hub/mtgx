/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { MessageComposer } from "../MessageComposer";

// ---- i18n mock ----
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      if (typeof fallback === "string") return fallback;
      return key;
    },
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
}));

// ---- apiFetch mock ----
const mockApiFetch = vi.fn();

vi.mock("@/lib/api", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiUrl: (p: string) => `https://test.co${p}`,
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

// ---- toast mock ----
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

function renderComposer(eventId = "event-123") {
  return renderWithProviders(<MessageComposer eventId={eventId} />);
}

describe("MessageComposer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    });
  });

  // ---------- Textarea ----------
  describe("Textarea", () => {
    it("renders textarea with placeholder", () => {
      renderComposer();
      expect(
        screen.getByPlaceholderText("Write a message to all participants...")
      ).toBeInTheDocument();
    });

    it("accepts user input", async () => {
      const user = userEvent.setup();
      renderComposer();
      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello everyone!");
      expect(textarea).toHaveValue("Hello everyone!");
    });

    it("renders card title", () => {
      renderComposer();
      expect(screen.getByText("Message participants")).toBeInTheDocument();
    });
  });

  // ---------- Character counter ----------
  describe("Character counter", () => {
    it("shows 0/500 initially", () => {
      renderComposer();
      expect(screen.getByText("0/500")).toBeInTheDocument();
    });

    it("updates count as user types", async () => {
      const user = userEvent.setup();
      renderComposer();
      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");
      expect(screen.getByText("5/500")).toBeInTheDocument();
    });

    it("shows count in red when over 500 chars", async () => {
      const user = userEvent.setup();
      renderComposer();
      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );

      // Type exactly 501 chars (textarea maxLength is 550, allows slightly over)
      const longText = "a".repeat(501);
      await user.type(textarea, longText);

      const counter = screen.getByText("501/500");
      expect(counter).toBeInTheDocument();
      expect(counter.className).toContain("text-red");
    });

    it("shows normal color when at exactly 500 chars", async () => {
      const user = userEvent.setup();
      renderComposer();
      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );

      const exactText = "b".repeat(500);
      await user.type(textarea, exactText);

      const counter = screen.getByText("500/500");
      expect(counter).toBeInTheDocument();
      expect(counter.className).not.toContain("text-red");
    });
  });

  // ---------- Send button ----------
  describe("Send button", () => {
    it("renders send button with label", () => {
      renderComposer();
      expect(screen.getByText("Send")).toBeInTheDocument();
    });

    it("send button is disabled when textarea is empty", () => {
      renderComposer();
      const sendBtn = screen.getByText("Send").closest("button")!;
      expect(sendBtn).toBeDisabled();
    });

    it("send button is enabled when textarea has content", async () => {
      const user = userEvent.setup();
      renderComposer();
      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");

      const sendBtn = screen.getByText("Send").closest("button")!;
      expect(sendBtn).not.toBeDisabled();
    });

    it("send button is disabled when body is only whitespace", async () => {
      const user = userEvent.setup();
      renderComposer();
      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "   ");

      const sendBtn = screen.getByText("Send").closest("button")!;
      expect(sendBtn).toBeDisabled();
    });

    it("send button is disabled when over 500 chars", async () => {
      const user = userEvent.setup();
      renderComposer();
      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );

      const longText = "x".repeat(501);
      await user.type(textarea, longText);

      const sendBtn = screen.getByText("Send").closest("button")!;
      expect(sendBtn).toBeDisabled();
    });

    it("send button is disabled during sending", async () => {
      // Make apiFetch hang
      mockApiFetch.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      // Button should be disabled while sending
      await waitFor(() => {
        expect(sendBtn).toBeDisabled();
      });
    });
  });

  // ---------- Submit flow ----------
  describe("Submit", () => {
    it("calls apiFetch POST /event-message with event_id and message", async () => {
      const user = userEvent.setup();
      renderComposer("event-456");

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Important update!");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith("/event-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: "event-456",
            message: "Important update!",
          }),
        });
      });
    });

    it("trims message body before sending", async () => {
      const user = userEvent.setup();
      renderComposer("event-789");

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "  trimmed message  ");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith("/event-message", expect.objectContaining({
          body: JSON.stringify({
            event_id: "event-789",
            message: "trimmed message",
          }),
        }));
      });
    });

    it("uses the provided eventId prop", async () => {
      const user = userEvent.setup();
      renderComposer("custom-event-id");

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Test");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        const callBody = JSON.parse(
          (mockApiFetch.mock.calls[0][1] as any).body
        );
        expect(callBody.event_id).toBe("custom-event-id");
      });
    });
  });

  // ---------- Success ----------
  describe("Success", () => {
    it("clears textarea on successful send", async () => {
      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello everyone!");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(textarea).toHaveValue("");
      });
    });

    it("shows success toast on successful send", async () => {
      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello everyone!");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Message sent to participants",
          })
        );
      });
    });

    it("resets character count to 0 after send", async () => {
      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");
      expect(screen.getByText("5/500")).toBeInTheDocument();

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(screen.getByText("0/500")).toBeInTheDocument();
      });
    });
  });

  // ---------- Error ----------
  describe("Error", () => {
    it("shows error toast when API returns not ok", async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Unauthorized" }),
      });

      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
          })
        );
      });
    });

    it("includes error description from API response", async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Event not found" }),
      });

      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
            description: "Event not found",
          })
        );
      });
    });

    it("does not clear textarea on error", async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Error" }),
      });

      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });

      // Textarea should still have the text
      expect(textarea).toHaveValue("Hello");
    });

    it("handles JSON parse failure gracefully", async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            variant: "destructive",
          })
        );
      });
    });

    it("re-enables send button after error", async () => {
      mockApiFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Error" }),
      });

      const user = userEvent.setup();
      renderComposer();

      const textarea = screen.getByPlaceholderText(
        "Write a message to all participants..."
      );
      await user.type(textarea, "Hello");

      const sendBtn = screen.getByText("Send").closest("button")!;
      await user.click(sendBtn);

      await waitFor(() => {
        expect(sendBtn).not.toBeDisabled();
      });
    });
  });
});
