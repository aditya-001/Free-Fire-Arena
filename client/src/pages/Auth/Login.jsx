import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

// Validation schemas
const loginSchema = z.object({
  identifier: z.string().min(3, "Identifier must be at least 3 chars"),
  password: z.string().optional(),
  otp: z.string().optional(),
});

const Login = () => {
  const [loginMethod, setLoginMethod] = useState("password"); // "password" | "otp"
  const [inputType, setInputType] = useState("Username / Game ID");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPwd, setShowForgotPwd] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", otp: "" },
  });

  const identifierValue = watch("identifier");

  // Real-time detection of input type
  useEffect(() => {
    if (!identifierValue) {
      setInputType("Email / Phone / Username / Game ID");
      return;
    }
    if (identifierValue.includes("@")) {
      setInputType("Email");
    } else if (/^\d{10,}$/.test(identifierValue)) {
      setInputType("Phone Number");
    } else {
      setInputType("Username / Game ID");
    }
  }, [identifierValue]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const payload = {
        identifier: data.identifier,
        password: data.password,
      };

      await login(payload);
      // Removed toast and navigate from here because AuthContext already handles them if successful
      // navigate("/profile") is also handled by AuthWrapper or App.jsx routing effect usually, but let's navigate just in case
      navigate("/profile");
    } catch (err) {
      toast.error(err.response?.data?.message || "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col w-full h-full justify-center max-w-md mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tighter text-white mb-2 font-['Rajdhani'] flex items-center gap-2">
          RETURN TO
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonCyan to-neonBlue">
            THE ARENA
          </span>
        </h1>
        <p className="text-gray-400">Sign in to your champion account.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 relative"
      >
        <AnimatePresence>
          {Object.keys(errors).length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: [-10, 10, -10, 10, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute -top-12 left-0 right-0 bg-neonRed/10 border border-neonRed/30 text-neonRed px-4 py-2 rounded-lg text-sm"
            >
              Invalid credentials or missing fields.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dynamic Identifier Input */}
        <div className="relative group">
          <input
            {...register("identifier")}
            className={`w-full bg-black/40 border ${errors.identifier ? "border-neonRed ring-1 ring-neonRed/50" : "border-white/10 group-focus-within:border-neonCyan group-focus-within:ring-1 group-focus-within:ring-neonCyan/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
            placeholder=" "
            autoComplete="off"
            id="identifier"
          />
          <label
            htmlFor="identifier"
            className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonCyan pointer-events-none"
          >
            {inputType}
          </label>
        </div>

        {/* Toggle between Password / OTP */}
        <div className="flex bg-black/40 rounded-xl p-1 mb-2 border border-white/5">
          <button
            type="button"
            onClick={() => setLoginMethod("password")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "password" ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "text-gray-500 hover:text-gray-300"}`}
          >
            Use Password
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod("otp")}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === "otp" ? "bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]" : "text-gray-500 hover:text-gray-300"}`}
          >
            Login with OTP
          </button>
        </div>

        {/* Conditionally rendered Password or OTP input */}
        <AnimatePresence mode="popLayout">
          {loginMethod === "password" ? (
            <motion.div
              key="pwd"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="relative group"
            >
              <input
                type="password"
                {...register("password")}
                className={`w-full bg-black/40 border ${errors.password ? "border-neonRed" : "border-white/10 group-focus-within:border-neonCyan group-focus-within:ring-1 group-focus-within:ring-neonCyan/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                placeholder=" "
                id="login-pwd"
              />
              <label
                htmlFor="login-pwd"
                className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonCyan pointer-events-none"
              >
                Password
              </label>

              <button
                type="button"
                onClick={() => setShowForgotPwd(true)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neonCyan hover:text-white transition-colors"
              >
                Forgot?
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="otp"
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="flex flex-col gap-3"
            >
              <div className="flex gap-2 justify-between">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    className="w-12 h-14 bg-black/40 border border-white/10 focus:border-neonCyan focus:ring-1 focus:ring-neonCyan/50 text-white rounded-xl text-center text-xl font-bold outline-none transition-all"
                  />
                ))}
              </div>
              <button
                type="button"
                className="text-xs text-center text-gray-400 hover:text-white transition-colors"
                onClick={() =>
                  toast(
                    "OTP Sent to " + (identifierValue || "your requested ID"),
                  )
                }
              >
                Resend OTP
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full bg-gradient-to-r from-neonBlue to-neonCyan text-white font-bold py-3.5 rounded-xl uppercase tracking-wider relative overflow-hidden group shadow-neon-cyan"
        >
          <span
            className={`relative z-10 transition-opacity ${isSubmitting ? "opacity-0" : "opacity-100"}`}
          >
            INITIALIZE
          </span>
          {isSubmitting && (
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
          {/* Subtle button sweep overlay */}
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
        </motion.button>
      </form>

      <p className="mt-8 text-center text-gray-500 text-sm">
        New to the arena?{" "}
        <Link
          to="/auth/user-register"
          className="text-neonCyan hover:text-white transition-colors font-bold tracking-wide"
        >
          CREATE ACCOUNT
        </Link>
      </p>
    </motion.div>
  );
};

export default Login;
