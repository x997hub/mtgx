import { createRoot } from "react-dom/client";
import { App } from "./App";
import { router } from "./router";
import "./index.css";

// Track SPA page views in Google Analytics
declare function gtag(...args: unknown[]): void;

function trackPageView(url: string) {
  if (typeof gtag === "function") {
    gtag("event", "page_view", { page_path: url });
  }
}

// Initial page view
trackPageView(window.location.pathname + window.location.search);

// Track on route change
router.subscribe((state) => {
  trackPageView(state.location.pathname + state.location.search);
});

createRoot(document.getElementById("root")!).render(<App />);
