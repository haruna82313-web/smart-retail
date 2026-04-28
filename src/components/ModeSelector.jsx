import { useState } from "react";

/**
 * ModeSelector
 * Allows users to switch between RETAIL and WHOLESALE modes
 * Only visible if business_modes.mode is 'both'
 * Single-location users are tied to one mode automatically
 */
export default function ModeSelector({ currentMode = "retail", onModeChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const modes = [
    { value: "retail", label: "🛒 RETAIL", description: "Selling to end consumers" },
    { value: "wholesale", label: "📦 WHOLESALE", description: "Selling to retailers/distributors" },
  ];

  const handleSelect = (mode) => {
    onModeChange?.(mode);
    setIsOpen(false);
  };

  const currentModeLabel = modes.find(m => m.value === currentMode)?.label || "Select Mode";

  return (
    <div className="mode-selector-container">
      <button
        className="mode-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle operating mode"
      >
        {currentModeLabel}
        <span className={`mode-selector-arrow ${isOpen ? "open" : ""}`}>▼</span>
      </button>

      {isOpen && (
        <div className="mode-selector-dropdown">
          {modes.map((mode) => (
            <button
              key={mode.value}
              className={`mode-option ${currentMode === mode.value ? "active" : ""}`}
              onClick={() => handleSelect(mode.value)}
            >
              <div className="mode-option-label">{mode.label}</div>
              <div className="mode-option-desc">{mode.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
