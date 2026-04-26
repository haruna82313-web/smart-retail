let deferredPrompt = null;

// Listen for install availability
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// Function to trigger install
export const triggerInstall = async () => {
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    deferredPrompt = null;
  }

  return outcome === "accepted";
};

// Optional helper
export const canInstall = () => !!deferredPrompt;
