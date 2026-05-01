import { useState } from "react";
import { useAppState } from "../state/AppStateContext";
import SystemToast from "../components/SystemToast";
import AppModal from "../components/AppModal";
import "./Subscription.css";

export default function Subscription() {
  const { 
    user, 
    isOwner, 
    subscription, 
    data, 
    submitPaymentRequest, 
    approvePaymentRequest, 
    rejectPaymentRequest 
  } = useAppState();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    amount: "55000",
    transactionId: "",
    paymentMethod: "Airtel",
  });
  const [notice, setNotice] = useState({ message: "", type: "info" });
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState("");

  const formatUGX = (n) => "UGX " + Number(n || 0).toLocaleString();

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setNotice({ message: `${label} copied to clipboard!`, type: "success" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transactionId) {
      return setNotice({ message: "Please enter the Transaction ID.", type: "error" });
    }
    setLoading(true);
    const res = await submitPaymentRequest({
      amount: Number(form.amount),
      transaction_id: form.transactionId,
      payment_method: form.paymentMethod,
      plan_type: "pro",
      status: "pending"
    });
    setLoading(false);
    if (res.ok) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setStep(1);
        setForm({ ...form, transactionId: "" });
      }, 3000);
    } else {
      setNotice({ message: res.error, type: "error" });
    }
  };

  const handleApprove = async (req) => {
    if (!window.confirm(`Approve payment of ${formatUGX(req.amount)}?`)) return;
    setLoading(true);
    const res = await approvePaymentRequest(req.id, req.user_id, "pro");
    if (res.ok) {
      setNotice({ message: "Subscription activated successfully!", type: "success" });
    } else {
      setNotice({ message: res.error, type: "error" });
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectionNotes) return setNotice({ message: "Please provide a reason.", type: "error" });
    setLoading(true);
    const res = await rejectPaymentRequest(rejectingRequest.id, rejectionNotes);
    setLoading(false);
    if (res.ok) {
      setNotice({ message: "Request rejected.", type: "info" });
      setRejectingRequest(null);
      setRejectionNotes("");
    } else {
      setNotice({ message: res.error, type: "error" });
    }
  };

  return (
    <div className="section subscription-page">
      <SystemToast message={notice.message} type={notice.type} onClose={() => setNotice({ message: "", type: "info" })} />
      
      <div className="subscription-container">
        {/* LEFT/TOP: Status Card */}
        <div className="status-card glass-card">
          <div className="status-display-stack">
            <h2 className="section-title">Account Status</h2>
            <span className={`status-badge ${isOwner ? 'active' : subscription.status}`}>
              {isOwner ? 'ACTIVE' : subscription.status === 'active' ? 'ACTIVE' : 'NOT ACTIVE'}
            </span>
          </div>
          
          <div className="status-details">
            <div className="detail-row">
              <span className="label">Current Plan</span>
              <span className="value">{isOwner ? "Unlimited Access" : subscription.plan.toUpperCase()}</span>
            </div>
            {subscription.expiresAt && !isOwner && (
              <div className="detail-row">
                <span className="label">Expires On</span>
                <span className="value">{new Date(subscription.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {step === 1 && !isOwner && (
            <button className="renew-btn" onClick={() => setStep(2)}>
              Renew or Upgrade Plan
            </button>
          )}
        </div>

        {/* RIGHT/MIDDLE: Payment Wizard */}
        {!isOwner && step > 1 && (
          <div className="payment-wizard glass-card">
            {isSuccess ? (
              <div className="success-animation">
                <div className="checkmark-circle">
                  <div className="checkmark draw"></div>
                </div>
                <h3>Request Submitted!</h3>
                <p>We're verifying your payment...</p>
              </div>
            ) : (
              <>
                <div className="wizard-header">
                  <button className="back-step-btn" onClick={() => setStep(step - 1)}>← Back</button>
                  <h3>Step {step - 1} of 2</h3>
                </div>

                {step === 2 && (
                  <div className="wizard-step">
                    <h4>Select Payment Method</h4>
                    <div className="payment-options">
                      <div className="method-option airtel active">
                        <div className="method-info">
                          <strong>Airtel Money</strong>
                          <div className="copyable-row">
                            <span className="phone-num">0752333216</span>
                            <button className="copy-btn" onClick={() => copyToClipboard("0752333216", "Phone number")}>📋</button>
                          </div>
                          <span className="account-name">Luzira Hellen</span>
                        </div>
                        <div className="price-info">
                          <span className="amount">{formatUGX(55000)}</span>
                          <span className="period">/ month</span>
                        </div>
                      </div>

                      <div className="method-option mtn disabled">
                        <strong>MTN Mobile Money</strong>
                        <span>Coming Soon</span>
                      </div>
                    </div>
                    <button className="wizard-next-btn" onClick={() => setStep(3)}>Next: Submit Proof</button>
                  </div>
                )}

                {step === 3 && (
                  <form onSubmit={handleSubmit} className="wizard-step">
                    <h4>Submit Transaction Proof</h4>
                    <p className="instruction-text">Enter the Transaction ID from your Airtel Money SMS.</p>
                    <div className="txid-input-wrapper">
                      <input 
                        type="text" 
                        value={form.transactionId} 
                        onChange={(e) => setForm({ ...form, transactionId: e.target.value.toUpperCase() })} 
                        placeholder="e.g. MP230430.1234.H12345"
                        required
                        className="txid-input"
                      />
                    </div>
                    <div className="sticky-footer">
                      <button type="submit" className="activate-plan-btn" disabled={loading}>
                        {loading ? (
                          <div className="spinner-small"></div>
                        ) : "Activate My Plan"}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        )}

        {/* BOTTOM: Admin or History Table */}
        <div className="data-section glass-card">
          <h3 className="section-subtitle">
            {isOwner ? "Admin: Payment Requests" : "My Payment History"}
          </h3>
          
          <div className="table-responsive">
            {data.paymentRequests.length === 0 ? (
              <p className="empty-msg">No records found.</p>
            ) : (
              <table className="modern-table">
                <thead>
                  <tr>
                    {isOwner && <th>User</th>}
                    <th>Date</th>
                    <th>TXID</th>
                    <th>Status</th>
                    {isOwner && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.paymentRequests.map((req) => (
                    <tr key={req.id}>
                      {isOwner && (
                        <td data-label="User" className="user-cell" title={req.user_id}>
                          {req.user_id.slice(0, 8)}
                        </td>
                      )}
                      <td data-label="Date">
                        {new Date(req.submitted_at).toLocaleDateString()}
                      </td>
                      <td data-label="TXID" className="txid-cell">
                        {req.transaction_id}
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge ${req.status}`}>
                          {req.status}
                        </span>
                      </td>
                      {isOwner && (
                        <td data-label="Actions">
                          {req.status === 'pending' && (
                            <div className="table-actions">
                              <button onClick={() => handleApprove(req)} className="btn-approve">Approve</button>
                              <button onClick={() => setRejectingRequest(req)} className="btn-reject">Reject</button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <AppModal 
        open={Boolean(rejectingRequest)} 
        onClose={() => setRejectingRequest(null)} 
        title="Reject Payment"
      >
        <div className="rejection-form">
          <p>Provide a reason for rejection:</p>
          <textarea 
            value={rejectionNotes} 
            onChange={(e) => setRejectionNotes(e.target.value)}
            placeholder="e.g. Invalid Transaction ID"
          />
          <div className="modal-actions">
            <button onClick={handleReject} className="confirm-reject-btn" disabled={loading}>
              {loading ? "Processing..." : "Confirm Reject"}
            </button>
            <button onClick={() => setRejectingRequest(null)} className="cancel-btn">Cancel</button>
          </div>
        </div>
      </AppModal>
    </div>
  );
}
