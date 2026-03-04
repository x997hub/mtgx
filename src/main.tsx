import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

// Force service worker update and clear stale caches on load
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const reg of registrations) {
      reg.update();
    }
  });
  caches.keys().then((names) => {
    for (const name of names) {
      if (name.includes("api-cache")) {
        caches.delete(name);
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
