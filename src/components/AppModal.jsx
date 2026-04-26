export default function AppModal({
  open,
  title,
  children,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmDisabled = false,
}) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>{title}</h3>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="btn-admin-idle" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn-admin-active" onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
