import { useState } from "react";
import { supabase } from "./supabaseClient";
import SystemToast from "./components/SystemToast";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState({ message: "", type: "info" });

  const signIn = async () => {
    setLoading(true);
    setError(false);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(true); // Triggers the shake class in CSS
      setNotice({ message: authError.message, type: "error" });
      return;
    }
    setNotice({ message: `Welcome ${data.user?.email || ""}`.trim(), type: "success" });
  };

  const signUp = async () => {
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    if (authError) return setNotice({ message: authError.message, type: "error" });
    
    if (data.user) {
      const { error: settingsError } = await supabase
        .from("user_settings")
        .insert([{ 
          user_id: data.user.id, 
          admin_pin_hash: "123456",
          shop_is_open: true 
        }]);
      
      if (settingsError) {
        console.log("Could not create user settings:", settingsError.message);
      }
    }
    
    setNotice({ message: "Check your email to confirm account.", type: "success" });
  };

  const resetPassword = async () => {
    if (!email) return setNotice({ message: "Enter email first.", type: "warning" });
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (authError) return setNotice({ message: authError.message, type: "error" });
    setNotice({ message: "Reset email sent.", type: "success" });
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        {/* Left Side: Login Form */}
        <div className={`auth-box ${error ? "shake-error" : ""}`}>
          <SystemToast
            message={notice.message}
            type={notice.type}
            onClose={() => setNotice({ message: "", type: "info" })}
          />
          
          <h1 className="logo">
            SMART<span>RETAIL</span>
          </h1>

          <h3>Login to your account</h3>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="password-field">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <span onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          <div className="auth-button-row">
            <button className="auth-action-btn auth-action-login" onClick={signIn} disabled={loading}>
              {loading ? "..." : "Login"}
            </button>

            <button onClick={signUp} className="secondary auth-action-btn auth-action-signup" disabled={loading}>
              {loading ? "..." : "Sign Up"}
            </button>

            <button onClick={resetPassword} className="link auth-action-btn auth-action-forgot" disabled={loading}>
              Forgot?
            </button>
          </div>
        </div>

        {/* Right Side: Professional Branding (Desktop Only) */}
        <div className="auth-side-panel">
          <div className="panel-content">
            <div className="panel-badge">Smart Retail v2.0</div>
            <h2>Elevate Your Business Management</h2>
            <p>Experience the future of retail with real-time analytics, seamless stock tracking, and professional financial reporting.</p>
            
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <div className="feature-text">
                  <strong>Advanced Analytics</strong>
                  <p>Track your profit and loss with precision</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🛡️</span>
                <div className="feature-text">
                  <strong>Secure & Reliable</strong>
                  <p>Enterprise-grade security for your data</p>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <div className="feature-text">
                  <strong>Lightning Fast</strong>
                  <p>Optimized for quick sales and inventory updates</p>
                </div>
              </div>
            </div>

            <div className="panel-quote">
              "The goal as a company is to have customer service that is not just the best but legendary."
              <span>— Sam Walton</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
