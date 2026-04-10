import { motion } from "framer-motion";

const AuthWrapper = ({ children, illustration }) => {
  return (
    <div className="min-h-screen w-full bg-[#0b0f19] flex items-center justify-center relative overflow-hidden font-['Space_Grotesk'] text-white">
      {/* Background Particles/Gradients */}
      <div className="absolute inset-0 z-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full blur-[120px] bg-neonPurple opacity-30 mix-blend-screen"
        />
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.4, 0.2],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full blur-[150px] bg-neonCyan opacity-20 mix-blend-screen"
        />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      {/* Main Glass Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl z-10 flex flex-col md:flex-row bg-glassBg backdrop-blur-xl border border-glassBorder rounded-2xl shadow-2xl relative overflow-hidden mx-4"
      >
        {/* Top/Bottom edge neon glow */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-neonCyan to-transparent opacity-50" />

        {/* Left Side: Illustration (Hidden on small screens) */}
        <div className="hidden md:flex md:w-5/12 bg-[rgba(0,0,0,0.4)] p-8 flex-col justify-between relative border-r border-[rgba(255,255,255,0.05)]">
          <div className="z-10 mt-8">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
              {illustration?.title || "Welcome to the Arena"}
            </h2>
            <p className="text-gray-400 text-sm">
              {illustration?.subtitle || "Compete. Prevail. Conquer."}
            </p>
          </div>

          {/* Abstract gaming visual/illustration area */}
          <div className="my-auto w-full h-64 relative flex items-center justify-center">
            <motion.div
              animate={{ translateY: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-48 h-48 rounded-2xl bg-gradient-to-tr from-neonCyan to-neonPurple opacity-80 blur-[20px] absolute"
            />
            <div className="w-40 h-40 border border-white/20 backdrop-blur-md rounded-xl z-10 flex items-center justify-center bg-white/5 shadow-2xl shadow-neonCyan/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-neonCyan drop-shadow-[0_0_10px_rgba(0,240,255,1)]"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
          </div>

          <div className="z-10 pb-4 text-xs text-gray-500">
            Free Fire Esports Platform © {new Date().getFullYear()}
          </div>
        </div>

        {/* Right Side: Form Content */}
        <div className="w-full md:w-7/12 p-8 md:p-12 relative flex flex-col justify-center">
          {children}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthWrapper;
