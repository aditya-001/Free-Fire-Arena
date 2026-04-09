import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import TournamentsPage from "./pages/TournamentsPage";
import LoadingSpinner from "./components/LoadingSpinner";
import { useAuth } from "./contexts/AuthContext";

const RequireAuth = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Loading your player profile..." fullscreen />;
  }

  return user ? children : <Navigate to="/auth" replace />;
};

const App = () => (
  <Routes>
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
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  </Routes>
);

export default App;
