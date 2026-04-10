import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const loginInitial = { email: "", password: "" };
const registerInitial = {
  username: "",
  email: "",
  password: "",
  uid: "",
  state: "",
  city: ""
};

const AuthPage = () => {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(loginInitial);
  const [registerForm, setRegisterForm] = useState(registerInitial);
  const [submitting, setSubmitting] = useState(false);
  const { login, register, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/profile");
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "login") {
        await login(loginForm);
      } else {
        await register(registerForm);
      }

      navigate("/profile");
    } catch (error) {
      toast.error(error.response?.data?.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content auth-page">
      <section className="glass-card auth-card">
        <div className="auth-switch">
          <button
            className={`tab-button ${mode === "login" ? "tab-button--active" : ""}`}
            onClick={() => setMode("login")}
            type="button"
          >
            Login
          </button>
          <button
            className={`tab-button ${mode === "register" ? "tab-button--active" : ""}`}
            onClick={() => setMode("register")}
            type="button"
          >
            Register
          </button>
        </div>

        <div>
          <p className="section-kicker">Authentication</p>
          <h2>{mode === "login" ? "Welcome back, contender." : "Create your player account."}</h2>
          <p className="section-copy">
            Secure JWT login with quick access to tournaments, live chat and your personal stats.
          </p>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <div className="field-grid">
              <div className="field-group">
                <label>Username</label>
                <input
                  required
                  value={registerForm.username}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, username: event.target.value }))
                  }
                />
              </div>
              <div className="field-group">
                <label>Free Fire UID</label>
                <input
                  required
                  value={registerForm.uid}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, uid: event.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <div className="field-grid">
            <div className="field-group">
              <label>Email</label>
              <input
                required
                type="email"
                value={mode === "login" ? loginForm.email : registerForm.email}
                onChange={(event) =>
                  mode === "login"
                    ? setLoginForm((current) => ({ ...current, email: event.target.value }))
                    : setRegisterForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className="field-group">
              <label>Password</label>
              <input
                required
                minLength="6"
                type="password"
                value={mode === "login" ? loginForm.password : registerForm.password}
                onChange={(event) =>
                  mode === "login"
                    ? setLoginForm((current) => ({ ...current, password: event.target.value }))
                    : setRegisterForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
          </div>

          {mode === "register" && (
            <div className="field-grid">
              <div className="field-group">
                <label>State</label>
                <input
                  value={registerForm.state}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, state: event.target.value }))
                  }
                />
              </div>
              <div className="field-group">
                <label>City</label>
                <input
                  value={registerForm.city}
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, city: event.target.value }))
                  }
                />
              </div>
            </div>
          )}

          <button className="cta-button" disabled={submitting} type="submit">
            {submitting ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>

        <div className="demo-card">
          <p className="section-kicker">Security Notice</p>
          <span>Use your own registered credentials. Demo accounts are disabled.</span>
        </div>
      </section>
    </div>
  );
};

export default AuthPage;
