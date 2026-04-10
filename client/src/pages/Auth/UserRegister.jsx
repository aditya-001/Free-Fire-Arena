import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

// Complex z-resolvers for steps
const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters").regex(/[a-zA-Z]/, "Username must contain at least one letter"),
    ffGameId: z.string().min(6, "Game ID must be at least 6 characters"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm Password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const getPasswordStrength = (pwd) => {
  if (!pwd) return 0;
  let strength = 0;
  if (pwd.length >= 6) strength += 25;
  if (pwd.match(/[a-z]+/)) strength += 25;
  if (pwd.match(/[A-Z]+/)) strength += 25;
  if (pwd.match(/[0-9]+/)) strength += 25;
  return strength;
};

const UserRegister = () => {
  const [step, setStep] = useState(1);
  const [isCheckingID, setIsCheckingID] = useState(false);
  const [idError, setIdError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  
  const [showOtpFields, setShowOtpFields] = useState(false);
  const [emailOtp, setEmailOtp] = useState(["", "", "", ""]);
  const [phoneOtp, setPhoneOtp] = useState(["", "", "", ""]);
  const [otpError, setOtpError] = useState(null);

  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  // We use one big schema and trigger
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      username: "",
      ffGameId: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const nextStep = async () => {
    let valid = false;
    if (step === 1) {
      valid = await trigger(["username", "ffGameId"]);
      if (valid) {
        setIsCheckingID(true);
        setTimeout(() => {
          setIsCheckingID(false);
          // Fake validation for taken ID
          if (watch("username") === "raistar") {
            setIdError("Username already taken");
            valid = false;
          } else {
            setIdError(null);
            setStep(2);
          }
        }, 800);
        return; // handle transition in timeout
      } else {
        toast.error("Please fill username and game id correctly");
      }
    } else if (step === 2) {
      valid = await trigger(["email", "phone"]);
      if (valid) {
        if (!showOtpFields) {
          // Show OTP fields and send OTP
          setShowOtpFields(true);
          toast.success("OTPs sent to Email and Phone!", {
            icon: '📩',
            style: { borderRadius: '10px', background: '#0b0f19', color: '#00f0ff' }
          });
        } else {
          // Verify OTPs
          const enteredEmailOtp = emailOtp.join("");
          const enteredPhoneOtp = phoneOtp.join("");
          if (enteredEmailOtp.length === 4 && enteredPhoneOtp.length === 4) {
             // Simulate successful OTP check
             toast.success("Verification successful!");
             setOtpError(null);
             setStep(3);
          } else {
             setOtpError("Please enter complete OTPs");
             toast.error("Please enter both 4-digit OTPs");
          }
        }
      } else {
        toast.error("Please fill email and phone correctly");
      }
    }
  };

  const prevStep = () => {
    if (step > 1) {
       if (step === 2 && showOtpFields) {
         setShowOtpFields(false);
       } else {
         setStep(step - 1);
       }
    }
  };

  const currentPwd = watch("password");
  const pwdStrength = getPasswordStrength(currentPwd);

  const onSubmit = async (data) => {
    if (step !== 3) {
      nextStep();
      return;
    }

    const isFinalValid = await trigger();
    if (!isFinalValid) return;

    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await authRegister({
        username: data.username,
        email: data.email,
        phone: data.phone,
        password: data.password,
        gameId: data.ffGameId,
        state: "Not Specified",
        city: "Not Specified"
      });
      setRegistrationSuccess(true);
      setTimeout(() => {
        navigate("/profile");
      }, 3000);
    } catch (err) {
      // Handled by AuthContext too, but just in case
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registrationSuccess) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-10 w-full h-[400px]"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-neonCyan/20 border-2 border-neonCyan flex items-center justify-center mb-6 shadow-neon-cyan"
        >
          <svg
            className="w-12 h-12 text-neonCyan"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>
        <h2 className="text-3xl font-bold text-white mb-2">ACCOUNT CREATED</h2>
        <p className="text-gray-400">Welcome to the inner circle.</p>
        <p className="text-xs text-gray-500 mt-4 animate-pulse">
          Redirecting to profile...
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col w-full max-w-md mx-auto relative pb-8"
    >
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold tracking-tighter text-white mb-2 font-['Rajdhani'] flex flex-col">
          <span>ENLIST IN</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neonPurple to-neonCyan drop-shadow-lg">
            THE TOURNAMENT
          </span>
        </h1>
        <p className="text-gray-400 text-sm mt-2">
          Step {step} of 3 • Player Identity
        </p>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden flex">
          <motion.div
            initial={{ width: "33%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ ease: "circOut", duration: 0.5 }}
            className={`h-full rounded-full ${step === 3 ? "bg-neonCyan" : "bg-neonPurple shadow-[0_0_10px_rgba(189,0,255,0.8)]"}`}
          />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < 3) {
            nextStep();
          } else {
            handleSubmit(onSubmit)(e);
          }
        }}
        className="flex flex-col gap-5"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-4"
            >
              <div className="relative group">
                <input
                  {...register("username")}
                  className={`w-full bg-black/40 border ${errors.username || idError ? "border-neonRed ring-1 ring-neonRed/50" : "border-white/10 focus:border-neonPurple focus:ring-1 focus:ring-neonPurple/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                  placeholder=" "
                />
                <label className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonPurple pointer-events-none">
                  Unique Username
                </label>
                {isCheckingID && (
                  <span className="absolute right-3 top-4 text-xs text-gray-400 animate-pulse">
                    Checking...
                  </span>
                )}
                {idError && (
                  <span className="absolute right-3 top-4 text-xs text-neonRed font-bold">
                    {idError}
                  </span>
                )}
                {!errors.username &&
                  !idError &&
                  watch("username").length > 2 &&
                  !isCheckingID && (
                    <span className="absolute right-3 top-4 text-neonCyan">
                      ✓
                    </span>
                  )}
              </div>

              <div className="relative group">
                <input
                  {...register("ffGameId")}
                  className={`w-full bg-black/40 border ${errors.ffGameId ? "border-neonRed ring-1 ring-neonRed/50" : "border-white/10 focus:border-neonPurple focus:ring-1 focus:ring-neonPurple/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                  placeholder=" "
                />
                <label className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonPurple pointer-events-none">
                  Free Fire Game ID
                </label>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-4"
            >
              {!showOtpFields ? (
                <>
                  <div className="relative group">
                    <input
                      {...register("email")}
                      className={`w-full bg-black/40 border ${errors.email ? "border-neonRed ring-1 ring-neonRed/50" : "border-white/10 focus:border-neonPurple focus:ring-1 focus:ring-neonPurple/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                      placeholder=" "
                    />
                    <label className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonPurple pointer-events-none">
                      Email Configuration
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <div className="w-1/4">
                      <div className="h-full w-full bg-black/40 border border-white/10 text-white rounded-xl flex items-center justify-center text-sm text-gray-400">
                        +91
                      </div>
                    </div>
                    <div className="relative group w-3/4">
                      <input
                        {...register("phone")}
                        type="tel"
                        className={`w-full bg-black/40 border ${errors.phone ? "border-neonRed ring-1 ring-neonRed/50" : "border-white/10 focus:border-neonPurple focus:ring-1 focus:ring-neonPurple/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                        placeholder=" "
                      />
                      <label className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonPurple pointer-events-none">
                        Phone Number
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-6"
                >
                  <p className="text-neonCyan text-sm font-bold px-1 mb-[-10px]">Verification Sent</p>
                  
                  {/* Email OTP */}
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block">Email OTP (sent to {watch("email")})</label>
                    <div className="flex gap-3 justify-between">
                      {emailOtp.map((digit, idx) => (
                        <input 
                          key={`e-${idx}`}
                          type="text" 
                          maxLength={1} 
                          value={digit}
                          onChange={(e) => {
                             const val = e.target.value;
                             if (!/^\d*$/.test(val)) return;
                             const newOtp = [...emailOtp];
                             newOtp[idx] = val;
                             setEmailOtp(newOtp);
                             if (val && idx < 3) {
                               document.getElementById(`e-otp-${idx+1}`)?.focus();
                             }
                          }}
                          onKeyDown={(e) => {
                             if (e.key === 'Backspace' && !digit && idx > 0) {
                                document.getElementById(`e-otp-${idx-1}`)?.focus();
                             }
                          }}
                          id={`e-otp-${idx}`}
                          className={`w-14 h-14 bg-black/40 border ${otpError && digit === "" ? 'border-neonRed focus:ring-neonRed/50' : 'border-white/10 focus:border-neonPurple focus:ring-neonPurple/50'} focus:ring-1 text-white rounded-xl text-center text-xl font-bold outline-none transition-all`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Phone OTP */}
                  <div>
                    <label className="text-gray-400 text-xs mb-2 block">Phone OTP (sent to {watch("phone")})</label>
                    <div className="flex gap-3 justify-between">
                      {phoneOtp.map((digit, idx) => (
                        <input 
                          key={`p-${idx}`}
                          type="text" 
                          maxLength={1} 
                          value={digit}
                          onChange={(e) => {
                             const val = e.target.value;
                             if (!/^\d*$/.test(val)) return;
                             const newOtp = [...phoneOtp];
                             newOtp[idx] = val;
                             setPhoneOtp(newOtp);
                             if (val && idx < 3) {
                               document.getElementById(`p-otp-${idx+1}`)?.focus();
                             }
                          }}
                          onKeyDown={(e) => {
                             if (e.key === 'Backspace' && !digit && idx > 0) {
                                document.getElementById(`p-otp-${idx-1}`)?.focus();
                             }
                          }}
                          id={`p-otp-${idx}`}
                          className={`w-14 h-14 bg-black/40 border ${otpError && digit === "" ? 'border-neonRed focus:ring-neonRed/50' : 'border-white/10 focus:border-neonPurple focus:ring-neonPurple/50'} focus:ring-1 text-white rounded-xl text-center text-xl font-bold outline-none transition-all`}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex flex-col gap-4"
            >
              <div className="relative group">
                <input
                  type="password"
                  {...register("password")}
                  className={`w-full bg-black/40 border ${errors.password ? "border-neonRed ring-1 ring-neonRed/50" : "border-white/10 focus:border-neonCyan focus:ring-1 focus:ring-neonCyan/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                  placeholder=" "
                />
                <label className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonCyan pointer-events-none">
                  Secure Password
                </label>

                {/* Password Strength Meter */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${pwdStrength >= i * 25 ? (pwdStrength === 100 ? "bg-neonCyan shadow-[0_0_5px_#00f0ff]" : "bg-neonPurple") : "bg-white/10"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="relative group">
                <input
                  type="password"
                  {...register("confirmPassword")}
                  className={`w-full bg-black/40 border ${errors.confirmPassword ? "border-neonRed ring-1 ring-neonRed/50" : "border-white/10 focus:border-neonCyan focus:ring-1 focus:ring-neonCyan/50"} text-white rounded-xl px-4 pt-6 pb-2 outline-none transition-all duration-300 peer`}
                  placeholder=" "
                />
                <label className="absolute left-4 top-1.5 text-gray-500 text-xs transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-neonCyan pointer-events-none">
                  Confirm Password
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-4 mt-6">
          {step > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="w-1/3 text-gray-400 font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-colors border border-white/5 shadow-lg"
            >
              BACK
            </button>
          )}

          {step < 3 ? (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={nextStep}
              className={`${step === 1 ? "w-full" : "w-2/3"} bg-gradient-to-r from-neonPurple to-purple-600 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider relative overflow-hidden group shadow-neon-purple border border-[rgba(189,0,255,0.4)] transition-all hover:border-[rgba(189,0,255,0.8)]`}
            >
              <span className="relative z-10 transition-opacity">
                {step === 2 && !showOtpFields ? "SEND OTPS" : "NEXT STEP"}
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-2/3 bg-gradient-to-r from-neonCyan to-blue-600 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider relative overflow-hidden group shadow-neon-cyan border border-[rgba(0,240,255,0.4)] transition-all hover:border-[rgba(0,240,255,0.8)]"
            >
              <span
                className={`relative z-10 transition-opacity ${isSubmitting ? "opacity-0" : "opacity-100"}`}
              >
                REGISTER
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
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            </motion.button>
          )}
        </div>
      </form>

      <p className="mt-8 text-center text-gray-500 text-sm">
        Already registered?{" "}
        <Link
          to="/auth/login"
          className="text-neonPurple hover:text-white transition-colors font-bold tracking-wide"
        >
          LOGIN NOW
        </Link>
      </p>
    </motion.div>
  );
};

export default UserRegister;
