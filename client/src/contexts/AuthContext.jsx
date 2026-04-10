import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/axiosInstance";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("ff_token"));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem("ff_token")));

  const hydrateUser = async () => {
    try {
      const { data } = await api.get("/users/me");
      setUser(data);
      return data;
    } catch (error) {
      localStorage.removeItem("ff_token");
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    hydrateUser();
  }, [token]);

  const authAction = async (endpoint, payload, successMessage) => {
    const { data } = await api.post(endpoint, payload);
    localStorage.setItem("ff_token", data.token);
    setToken(data.token);
    setUser(data.user);
    toast.success(successMessage);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("ff_token");
    setToken(null);
    setUser(null);
    toast.success("Logged out safely");
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        setUser,
        refreshProfile: hydrateUser,
        login: (payload) => authAction("/auth/login", payload, "Welcome back to the arena!"),
        register: (payload) => authAction("/auth/register", payload, "Account created successfully!"),
        adminLogin: (payload) => authAction("/auth/admin-login", payload, "ACCESS GRANTED: Command Center Active"),
        adminRegister: (payload) => authAction("/auth/admin-register", payload, "Admin Profile Indexed Successfully"),
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
