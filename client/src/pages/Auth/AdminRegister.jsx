import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const adminSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
});

const AdminRegister = () => {
  const [key, setKey] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [keyError, setKeyError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { adminRegister } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminSchema),
  });

  const checkKey = () => {
    // In production, this validates against an API/ENV variable
    if (key === "ELITE_ADMIN_2026") {
      setKeyError(false);
      setAccessGranted(true);
      toast.success("Security Clearance Verified");
    } else {
      setKeyError(true);
      setTimeout(() => setKeyError(false), 500); // end shake
    }
  };

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      await adminRegister({
        ...data,
        adminKey: key
      });
      navigate("/admin/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to register admin");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex flex-col w-full max-w-md mx-auto relative"
    >
      <div className="mb-8 border-b border-neonRed/20 pb-4">
        <h1 className="text-3xl text-white font-black tracking-widest font-['Rajdhani'] flex items-center gap-3">
          <svg
            className="w-8 h-8 text-neonRed"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
          SYSTEM OVERRIDE
        </h1>
        <p className="text-neonRed/80 text-xs tracking-[0.2em] mt-1 font-bold">
          UNAUTHORIZED ACCESS PROHIBITED
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!accessGranted ? (
          <motion.div
            key="lock-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            animate={keyError ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`bg-black/60 p-8 rounded-2xl border backdrop-blur-xl flex flex-col items-center justify-center text-center ${keyError ? "border-neonRed shadow-neon-red" : "border-neonPurple/50 shadow-neon-purple"}`}
          >
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-neonRed/50 flex items-center justify-center mb-6 relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-t-2 border-neonRed"
              />
              <svg
                className="w-8 h-8 text-neonRed"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <rect
                  x="3"
                  y="11"
                  width="18"
                  height="11"
                  rx="2"
                  ry="2"
                  strokeWidth="2"
                />
                <path d="M7 11V7a5 5 0 0110 0v4" strokeWidth="2" />
              </svg>
            </div>

            <h3 className="text-xl text-white font-bold mb-4 font-['Space_Grotesk']">
              AWAITING SECURITY KEY
            </h3>

            <div className="relative w-full mb-6 group">
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && checkKey()}
                className="w-full bg-black/50 border border-neonRed/30 focus:border-neonRed focus:ring-1 focus:ring-neonRed text-white tracking-[0.5em] text-center font-bold rounded-xl px-4 py-4 outline-none transition-all duration-300"
                placeholder="• • • • • •"
              />
              <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-b from-neonPurple to-neonRed rounded-l-xl opacity-50" />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={checkKey}
              className="w-full bg-neonRed/20 hover:bg-neonRed/40 border border-neonRed text-white font-bold py-3 rounded-xl tracking-widest transition-colors shadow-neon-red"
            >
              AUTHENTICATE
            </motion.button>
          </motion.div>
        ) : (
          <motion.form
            key="unlock-screen"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-3 bg-neonRed/10 border border-neonRed/50 rounded-lg p-3 text-neonRed">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-3 w-3 rounded-full bg-neonRed shadow-[0_0_8px_#ff003c]"
              />
              <span className="text-xs font-bold tracking-widest">
                ENCRYPTED CONNECTION ESTABLISHED
              </span>
            </div>

            <div className="relative group mt-4">
              <input
                {...register("username")}
                className={`w-full bg-black/40 border ${errors.username ? "border-neonRed ring-1 ring-neonRed/50" : "border-neonPurple/50 focus:border-neonRed focus:ring-1 focus:ring-neonRed/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                placeholder=" "
              />
              <label className="absolute left-4 top-1.5 text-neonPurple/80 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonRed pointer-events-none uppercase font-bold tracking-wider">
                Admin Designation
              </label>
            </div>

            <div className="relative group">
              <input
                {...register("email")}
                className={`w-full bg-black/40 border ${errors.email ? "border-neonRed ring-1 ring-neonRed/50" : "border-neonPurple/50 focus:border-neonRed focus:ring-1 focus:ring-neonRed/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                placeholder=" "
              />
              <label className="absolute left-4 top-1.5 text-neonPurple/80 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonRed pointer-events-none uppercase font-bold tracking-wider">
                Secure Email Relay
              </label>
            </div>

            <div className="relative group">
              <input
                {...register("phone")}
                className={`w-full bg-black/40 border ${errors.phone ? "border-neonRed ring-1 ring-neonRed/50" : "border-neonPurple/50 focus:border-neonRed focus:ring-1 focus:ring-neonRed/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                placeholder=" "
              />
              <label className="absolute left-4 top-1.5 text-neonPurple/80 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonRed pointer-events-none uppercase font-bold tracking-wider">
                Encrypted Comm Channel (Phone)
              </label>
            </div>

            <div className="relative group">
              <input
                type="password"
                {...register("password")}
                className={`w-full bg-black/40 border ${errors.password ? "border-neonRed ring-1 ring-neonRed/50" : "border-neonPurple/50 focus:border-neonRed focus:ring-1 focus:ring-neonRed/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                placeholder=" "
              />
              <label className="absolute left-4 top-1.5 text-neonPurple/80 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonRed pointer-events-none uppercase font-bold tracking-wider">
                Master Password
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="mt-4 w-full bg-gradient-to-r from-neonRed to-[#db00ff] text-white font-black py-4 rounded-xl uppercase tracking-[0.3em] relative overflow-hidden group shadow-neon-red"
            >
              <span
                className={`relative z-10 transition-opacity ${submitting ? "opacity-0" : "opacity-100"}`}
              >
                INITIALIZE ADMIN
              </span>
              {submitting && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                </span>
              )}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminRegister;
