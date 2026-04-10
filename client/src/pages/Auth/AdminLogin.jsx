import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";

const adminLoginSchema = z.object({
  adminId: z.string().min(3, "Required"),
  password: z.string().min(6, "Required"),
});

const AdminLogin = () => {
  const [submitting, setSubmitting] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  const navigate = useNavigate();
  const { adminLogin } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data) => {
    setSubmitting(true);

    try {
      await adminLogin({
        adminId: data.adminId, 
        password: data.password
      });

      navigate("/admin/dashboard");
    } catch (err) {
      setErrorShake(true);
      toast.error(err.response?.data?.message || "UNAUTHORIZED ACCESS. INTRUSION LOGGED.", {
        icon: "⚠️",
        style: {
          borderRadius: "10px",
          background: "#200000",
          color: "#ff003c",
          border: "1px solid #ff003c",
        },
      });
      setTimeout(() => setErrorShake(false), 500);
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
      <div className="mb-8 border-b border-neonRed/20 pb-4 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-neonRed/50 flex items-center justify-center relative">
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-t-2 border-neonRed"
            />
            <svg
              className="w-6 h-6 text-neonRed"
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
        </div>
        <h1 className="text-3xl text-white font-black tracking-widest font-['Rajdhani']">
          COMMAND CENTER
        </h1>
        <p className="text-neonRed/80 text-xs tracking-[0.2em] mt-2 font-bold animate-pulse">
          RESTRICTED PROTOCOL INITIATED
        </p>
      </div>

      <motion.form
        animate={errorShake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
        transition={{ duration: 0.4 }}
        onSubmit={handleSubmit(onSubmit)}
        className={`flex flex-col gap-6 bg-black/60 p-8 rounded-2xl border backdrop-blur-xl pointer-events-auto ${errorShake ? "border-neonRed shadow-neon-red" : "border-neonRed/30 shadow-[0_0_20px_rgba(255,0,0,0.1)]"}`}
      >
        <div className="relative group">
          <input
            {...register("adminId")}
            className={`w-full bg-black/50 border ${errors.adminId ? "border-neonRed ring-1 ring-neonRed/50" : "border-neonRed/40 focus:border-neonRed focus:ring-1 focus:ring-neonRed/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
            placeholder=" "
            autoComplete="off"
          />
          <label className="absolute left-4 top-1.5 text-neonRed/80 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonRed pointer-events-none uppercase font-bold tracking-wider">
            Admin Identifier
          </label>
        </div>

        <div className="relative group">
          <input
            type="password"
            {...register("password")}
            className={`w-full bg-black/50 border ${errors.password ? "border-neonRed ring-1 ring-neonRed/50" : "border-neonRed/40 focus:border-neonRed focus:ring-1 focus:ring-neonRed/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
            placeholder=" "
          />
          <label className="absolute left-4 top-1.5 text-neonRed/80 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonRed pointer-events-none uppercase font-bold tracking-wider">
            Clearance Passcode
          </label>
        </div>

        <motion.button
          type="submit"
          disabled={submitting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="mt-2 w-full bg-gradient-to-r from-[#500000] to-neonRed text-white font-black py-4 rounded-xl uppercase tracking-[0.2em] relative overflow-hidden group shadow-neon-red border border-transparent hover:border-white/50 transition-all hover:shadow-[0_0_30px_rgba(255,0,0,0.6)]"
        >
          <span
            className={`relative z-10 transition-opacity ${submitting ? "opacity-0" : "opacity-100"}`}
          >
            AUTHORIZE
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
    </motion.div>
  );
};

export default AdminLogin;
