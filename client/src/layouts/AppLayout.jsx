import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import backgroundImage from "../assets/free-fire-bg.jpg";
import Navbar from "../components/Navbar";

const AppLayout = () => (
  <div className="app-shell" style={{ "--app-background": `url(${backgroundImage})` }}>
    {/* The image supplied by the user stays visible on every page with a soft blur layer. */}
    <div className="app-shell__background" />
    <div className="app-shell__overlay" />
    <Navbar />
    <motion.main
      className="page-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Outlet />
    </motion.main>
  </div>
);

export default AppLayout;
