import { useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, MoonStar, SunMedium, Trophy, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const navLinkClass = ({ isActive }) => `nav-link ${isActive ? "nav-link--active" : ""}`;

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const leaderboardLinks = [
    { label: "All India", path: "/leaderboard?scope=india" },
    { label: "State", path: "/leaderboard?scope=state" },
    { label: "City", path: "/leaderboard?scope=city" }
  ];

  const handleLeaderBoardNavigate = (path) => {
    setLeaderboardOpen(false);
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <header className="navbar">
      <div className="brand-mark" onClick={() => navigate("/")}>
        <div className="brand-icon">
          <Trophy size={18} />
        </div>
        <div>
          <p className="brand-kicker">Arena</p>
          <h1>Free Fire</h1>
        </div>
      </div>

      <nav className={`nav-panel ${mobileOpen ? "nav-panel--open" : ""}`}>
        <NavLink className={navLinkClass} to="/" onClick={() => setMobileOpen(false)}>
          Home
        </NavLink>
        <NavLink className={navLinkClass} to="/tournaments" onClick={() => setMobileOpen(false)}>
          Tournaments
        </NavLink>

        <div
          className="dropdown"
          onMouseLeave={() => setLeaderboardOpen(false)}
        >
          <button
            className="nav-link nav-link--button"
            onClick={() => setLeaderboardOpen((current) => !current)}
            type="button"
          >
            Leaderboard <ChevronDown size={16} />
          </button>
          <div className={`dropdown-menu ${leaderboardOpen ? "dropdown-menu--open" : ""}`}>
            {leaderboardLinks.map((link) => (
              <button
                key={link.path}
                className="dropdown-item"
                onClick={() => handleLeaderBoardNavigate(link.path)}
                type="button"
              >
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <NavLink className={navLinkClass} to="/profile" onClick={() => setMobileOpen(false)}>
          Profile
        </NavLink>
      </nav>

      <div className="navbar-actions">
        <button className="icon-button" onClick={toggleTheme} type="button" aria-label="Toggle theme">
          {theme === "dark" ? <SunMedium size={18} /> : <MoonStar size={18} />}
        </button>

        <button className="icon-button icon-button--ghost" type="button" onClick={() => navigate("/profile")}>
          <Bell size={18} />
        </button>

        {user ? (
          <>
            <button className="profile-chip" onClick={() => navigate("/profile")} type="button">
              <User size={16} />
              <span>{user.username}</span>
            </button>
            <button className="icon-button" onClick={logout} type="button" aria-label="Logout">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <button className="cta-button cta-button--small" onClick={() => navigate("/auth/login")} type="button">
            Login
          </button>
        )}

        <button
          className="icon-button mobile-menu-toggle"
          onClick={() => setMobileOpen((current) => !current)}
          type="button"
          aria-label="Toggle navigation"
        >
          <Menu size={18} />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
