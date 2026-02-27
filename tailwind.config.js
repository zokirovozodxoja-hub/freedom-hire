/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2rem",
        "2xl": "2rem",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7c3aed",
          hover: "#6d28d9",
        },
        bgDark: "#070A12",
        card: "rgba(255,255,255,0.05)",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.35)",
        glow: "0 12px 40px rgba(124,58,237,0.35)",
      },
      borderRadius: {
        xl2: "1rem",
        xl3: "1.5rem",
      },
    },
  },
  plugins: [],
};