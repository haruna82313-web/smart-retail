import { useEffect } from "react";

export default function SystemToast({ message = "", type = "info", onClose, autoHideMs = 3500 }) {
  useEffect(() => {
    if (!message || !onClose) return;
    const timer = setTimeout(() => onClose(), autoHideMs);
    return () => clearTimeout(timer);
  }, [message, onClose, autoHideMs]);

  if (!message) return null;

  const variants = {
    info: {
      background: "rgba(15, 240, 252, 0.12)",
      border: "1px solid rgba(15, 240, 252, 0.45)",
      color: "#a5f3fc"
    },
    success: {
      background: "rgba(45, 212, 191, 0.14)",
      border: "1px solid rgba(45, 212, 191, 0.45)",
      color: "#99f6e4"
    },
    warning: {
      background: "rgba(245, 158, 11, 0.14)",
      border: "1px solid rgba(245, 158, 11, 0.45)",
      color: "#fcd34d"
    },
    error: {
      background: "rgba(239, 68, 68, 0.14)",
      border: "1px solid rgba(239, 68, 68, 0.45)",
      color: "#fca5a5"
    }
  };

  const theme = variants[type] || variants.info;

  return (
    <div
      style={{
        margin: "0 auto 14px auto",
        maxWidth: "560px",
        borderRadius: "12px",
        padding: "10px 12px",
        fontSize: "12px",
        fontWeight: 700,
        textAlign: "center",
        ...theme
      }}
    >
      {message}
    </div>
  );
}
