/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        glassBg: 'rgba(20, 25, 40, 0.45)',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
        neonCyan: '#00f0ff',
        neonPurple: '#bd00ff',
        neonRed: '#ff003c',
        neonBlue: '#0066ff'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))'
      },
      boxShadow: {
        'neon-cyan': '0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(0, 240, 255, 0.2)',
        'neon-purple': '0 0 10px rgba(189, 0, 255, 0.3), 0 0 20px rgba(189, 0, 255, 0.2)',
        'neon-red': '0 0 10px rgba(255, 0, 60, 0.3), 0 0 20px rgba(255, 0, 60, 0.2)',
      }
    },
  },
  plugins: [],
}