import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import ProtectedRoute from "./ProtectedRoute";
import AdminRoute from "./AdminRoute";

const AppLayout = lazy(() => import("../layouts/AppLayout"));
const HomePage = lazy(() => import("../pages/HomePage"));
const LeaderboardPage = lazy(() => import("../pages/LeaderboardPage"));
const ProfilePage = lazy(() => import("../pages/ProfilePage"));
const TournamentsPage = lazy(() => import("../pages/TournamentsPage"));
const WalletPage = lazy(() => import("../pages/Wallet"));
const AuthWrapper = lazy(() => import("../pages/Auth/AuthWrapper"));
const Login = lazy(() => import("../pages/Auth/Login"));
const UserRegister = lazy(() => import("../pages/Auth/UserRegister"));
const AdminRegister = lazy(() => import("../pages/Auth/AdminRegister"));
const AdminLogin = lazy(() => import("../pages/Auth/AdminLogin"));
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const ManageTournaments = lazy(() => import("../pages/admin/ManageTournaments"));
const MatchControl = lazy(() => import("../pages/admin/MatchControl"));
const ResultEntry = lazy(() => import("../pages/admin/ResultEntry"));
const EditResult = lazy(() => import("../pages/admin/EditResult"));
const Users = lazy(() => import("../pages/admin/Users"));
const Transactions = lazy(() => import("../pages/admin/Transactions"));
const AdminLayout = lazy(() => import("../components/admin/AdminLayout"));

const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner label="Loading arena interface..." fullscreen />}>
    <Routes>
      <Route
        path="/auth/login"
        element={
          <AuthWrapper
            illustration={{
              title: "RETURN TO THE ARENA",
              subtitle: "Log in with your existing credentials."
            }}
          >
            <Login />
          </AuthWrapper>
        }
      />
      <Route
        path="/auth/user-register"
        element={
          <AuthWrapper
            illustration={{
              title: "NEW CHALLENGER",
              subtitle: "Register and claim your dominance."
            }}
          >
            <UserRegister />
          </AuthWrapper>
        }
      />
      <Route
        path="/auth/admin-register"
        element={
          <AuthWrapper
            illustration={{
              title: "SYSTEM ADMIN",
              subtitle: "Enter initialization sequence."
            }}
          >
            <AdminRegister />
          </AuthWrapper>
        }
      />
      <Route
        path="/admin/login"
        element={
          <AuthWrapper
            illustration={{
              title: "RESTRICTED ACCESS",
              subtitle: "Only authorized personnel may enter the Command Center."
            }}
          >
            <AdminLogin />
          </AuthWrapper>
        }
      />
      <Route path="/auth/admin-login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/auth" element={<Navigate to="/auth/login" replace />} />

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="tournaments" element={<ManageTournaments />} />
        <Route path="matches" element={<Navigate to="/admin/matches/control" replace />} />
        <Route path="matches/control" element={<MatchControl />} />
        <Route path="matches/result-entry" element={<ResultEntry />} />
        <Route path="matches/edit" element={<EditResult />} />
        <Route path="users" element={<Users />} />
        <Route path="transactions" element={<Transactions />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/tournaments" element={<TournamentsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </Suspense>
);

export default AppRoutes;
