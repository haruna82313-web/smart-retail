import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";

// Suppress specific Supabase auth lock warning
const originalWarn = console.warn;
console.warn = function (...args) {
  if (
    args.length > 0 &&
    typeof args[0] === "string" &&
    args[0].includes("lock") &&
    args[0].includes("not released")
  ) {
    return; // Ignore this specific warning
  }
  originalWarn.apply(console, args);
};

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

// ✅ Register Service Worker ONLY in production
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch(() => {
        // Silent fail — app still works normally
      });
  });
}