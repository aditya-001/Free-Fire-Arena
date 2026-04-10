import { Navigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Loading your player profile..." fullscreen />;
  }

  return user ? children : <Navigate to="/auth" replace />;
};

export default ProtectedRoute;
