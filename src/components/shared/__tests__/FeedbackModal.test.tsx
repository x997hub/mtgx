/* eslint-disable @typescript-eslint/no-explicit-any */
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/renderWithProviders";
import { FeedbackModal } from "../FeedbackModal";

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

// ---- authStore mock ----
let mockUser: { id: string } | null = { id: "user-1" };
vi.mock("@/store/authStore", () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({ user: mockUser }),
}));

// ---- useFeedback mock ----
const mockSubmitFeedback = vi.fn();
let mockIsSubmitting = false;

vi.mock("@/hooks/useFeedback", () => ({
  useFeedback: () => ({
    submitFeedback: mockSubmitFeedback,
    isSubmitting: mockIsSubmitting,
    ownFeedback: [],
    isLoadingOwn: false,
  }),
}));

// ---- toast mock ----
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
  useToast: () => ({ toast: mockToast }),
}));

function renderFeedback() {
  return renderWithProviders(<FeedbackModal />);
}

describe("FeedbackModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1" };
    mockIsSubmitting = false;
    mockSubmitFeedback.mockResolvedValue({ id: 1 });
  });

  // ---------- Floating button ----------
  describe("Floating button", () => {
    it("renders floating button when user is authenticated", () => {
      renderFeedback();
      const btn = screen.getByRole("button", { name: "Feedback" });
      expect(btn).toBeInTheDocument();
    });

    it("does not render anything when user is not authenticated", () => {
      mockUser = null;
      const { container } = renderFeedback();
      expect(container.innerHTML).toBe("");
    });
  });

  // ---------- Dialog open/close ----------
  describe("Dialog open/close", () => {
    it("opens dialog on floating button click", async () => {
      const user = userEvent.setup();
      renderFeedback();

      const btn = screen.getByRole("button", { name: "Feedback" });
      await user.click(btn);

      expect(screen.getByText("Send feedback")).toBeInTheDocument();
    });

    it("dialog is not visible initially", () => {
      renderFeedback();
      expect(screen.queryByText("Send feedback")).not.toBeInTheDocument();
    });
  });

  // ---------- Type toggle ----------
  describe("Type toggle", () => {
    it("defaults to bug type (first type is selected)", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      // The bug button should have the active styling (border-accent)
      const bugBtn = screen.getByText("common:feedback_bug").closest("button")!;
      expect(bugBtn.className).toContain("border-accent");
    });

    it("renders all three type buttons: bug, suggestion, question", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      expect(screen.getByText("common:feedback_bug")).toBeInTheDocument();
      expect(screen.getByText("common:feedback_suggestion")).toBeInTheDocument();
      expect(screen.getByText("common:feedback_question")).toBeInTheDocument();
    });

    it("switches type when suggestion button is clicked", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const suggestionBtn = screen.getByText("common:feedback_suggestion").closest("button")!;
      await user.click(suggestionBtn);

      // suggestion button should now have active styling
      expect(suggestionBtn.className).toContain("border-accent");

      // bug button should have inactive styling
      const bugBtn = screen.getByText("common:feedback_bug").closest("button")!;
      expect(bugBtn.className).not.toContain("border-accent");
    });

    it("switches type when question button is clicked", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const questionBtn = screen.getByText("common:feedback_question").closest("button")!;
      await user.click(questionBtn);

      expect(questionBtn.className).toContain("border-accent");
    });
  });

  // ---------- Body textarea ----------
  describe("Body textarea", () => {
    it("renders textarea with placeholder", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      expect(
        screen.getByPlaceholderText("Describe your issue or suggestion...")
      ).toBeInTheDocument();
    });

    it("accepts user input", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "This is a bug report");
      expect(textarea).toHaveValue("This is a bug report");
    });

    it("shows character count", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      // Initially 0/2000
      expect(screen.getByText("0/2000")).toBeInTheDocument();
    });

    it("updates character count as user types", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "Hello");

      expect(screen.getByText("5/2000")).toBeInTheDocument();
    });
  });

  // ---------- Submit button ----------
  describe("Submit button", () => {
    it("submit button is disabled when body is empty", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const submitBtn = screen.getByText("Submit");
      expect(submitBtn.closest("button")).toBeDisabled();
    });

    it("submit button is enabled when body has text", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "Bug description");

      const submitBtn = screen.getByText("Submit");
      expect(submitBtn.closest("button")).not.toBeDisabled();
    });

    it("submit button is disabled when body is only whitespace", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "   ");

      const submitBtn = screen.getByText("Submit");
      expect(submitBtn.closest("button")).toBeDisabled();
    });
  });

  // ---------- Submit flow ----------
  describe("Submit flow", () => {
    it("calls submitFeedback with type and body on submit", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "Found a bug in the event page");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
          type: "bug",
          body: "Found a bug in the event page",
        });
      });
    });

    it("submits with suggestion type when selected", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      // Switch to suggestion
      const suggestionBtn = screen.getByText("common:feedback_suggestion").closest("button")!;
      await user.click(suggestionBtn);

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "Add dark mode");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
          type: "suggestion",
          body: "Add dark mode",
        });
      });
    });

    it("submits with question type when selected", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      // Switch to question
      const questionBtn = screen.getByText("common:feedback_question").closest("button")!;
      await user.click(questionBtn);

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "How do I create an event?");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
          type: "question",
          body: "How do I create an event?",
        });
      });
    });

    it("trims body before submitting", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "  bug report with spaces  ");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalledWith({
          type: "bug",
          body: "bug report with spaces",
        });
      });
    });
  });

  // ---------- Success ----------
  describe("Success", () => {
    it("shows success toast on successful submit", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "A bug report");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Feedback submitted. Thank you!" })
        );
      });
    });

    it("closes dialog on success", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      expect(screen.getByText("Send feedback")).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "A bug report");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.queryByText("Send feedback")).not.toBeInTheDocument();
      });
    });

    it("resets form fields on success", async () => {
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      // Switch to suggestion and type text
      const suggestionBtn = screen.getByText("common:feedback_suggestion").closest("button")!;
      await user.click(suggestionBtn);

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "A suggestion");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockSubmitFeedback).toHaveBeenCalled();
      });

      // Re-open dialog
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      // Body should be reset
      const newTextarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      expect(newTextarea).toHaveValue("");

      // Type should be reset to "bug"
      const bugBtn = screen.getByText("common:feedback_bug").closest("button")!;
      expect(bugBtn.className).toContain("border-accent");
    });
  });

  // ---------- Error ----------
  describe("Error", () => {
    it("shows error toast on submit failure", async () => {
      mockSubmitFeedback.mockRejectedValue(new Error("Server error"));
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "A bug report");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("does not close dialog on submit failure", async () => {
      mockSubmitFeedback.mockRejectedValue(new Error("Server error"));
      const user = userEvent.setup();
      renderFeedback();
      await user.click(screen.getByRole("button", { name: "Feedback" }));

      const textarea = screen.getByPlaceholderText("Describe your issue or suggestion...");
      await user.type(textarea, "A bug report");

      const submitBtn = screen.getByText("Submit").closest("button")!;
      await user.click(submitBtn);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });

      // Dialog should still be open
      expect(screen.getByText("Send feedback")).toBeInTheDocument();
    });
  });
});
