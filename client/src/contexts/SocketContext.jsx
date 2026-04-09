import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "../api/axiosInstance";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return undefined;
    }

    const connection = io(SERVER_URL, {
      auth: { token }
    });

    setSocket(connection);

    return () => {
      connection.disconnect();
      setSocket(null);
    };
  }, [token]);

  return <SocketContext.Provider value={{ socket }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
