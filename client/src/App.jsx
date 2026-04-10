import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import HomePage from "./pages/HomePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import TournamentsPage from "./pages/TournamentsPage";
import LoadingSpinner from "./components/LoadingSpinner";
import { useAuth } from "./contexts/AuthContext";

// Auth Components
import AuthWrapper from "./pages/Auth/AuthWrapper";
import Login from "./pages/Auth/Login";
import UserRegister from "./pages/Auth/UserRegister";
import AdminRegister from "./pages/Auth/AdminRegister";
import AdminLogin from "./pages/Auth/AdminLogin";

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Loading your player profile..." fullscreen />;
  }

  return user ? children : <Navigate to="/auth" replace />;
};

const App = () => (
  <Routes>
    {/* Standalone Auth Routes */}
    <Route path="/auth/login" element={<AuthWrapper illustration={{ title: "RETURN TO THE ARENA", subtitle: "Log in with your existing credentials." }}><Login /></AuthWrapper>} />
    <Route path="/auth/user-register" element={<AuthWrapper illustration={{ title: "NEW CHALLENGER", subtitle: "Register and claim your dominance." }}><UserRegister /></AuthWrapper>} />
    <Route path="/auth/admin-register" element={<AuthWrapper illustration={{ title: "SYSTEM ADMIN", subtitle: "Enter initialization sequence." }}><AdminRegister /></AuthWrapper>} />
    <Route path="/auth/admin-login" element={<AuthWrapper illustration={{ title: "RESTRICTED ACCESS", subtitle: "Only authorized personnel may enter the Command Center." }}><AdminLogin /></AuthWrapper>} />
    <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

    <Route element={<AppLayout />}>
      <Route index element={<HomePage />} />
      <Route path="/tournaments" element={<TournamentsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default App;
