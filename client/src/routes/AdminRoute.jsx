import { Navigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Authorizing command center access..." fullscreen />;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
