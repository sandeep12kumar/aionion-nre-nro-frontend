/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Aionion Capital: the logo's blue and pink
        brand: {
          blue: "#0023FF",
          pink: "#FE667C",
          navy: "#0B1240",
        },
      },
      backgroundImage: {
        // the logo's blue -> pink
        "brand-gradient": "linear-gradient(90deg, #0023FF 0%, #6D3BF5 50%, #FE667C 100%)",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 30px -12px rgba(15, 23, 42, 0.12)",
        lift: "0 18px 40px -16px rgba(15, 23, 42, 0.22)",
      },
      fontFamily: {
        // Replaces Tailwind's default sans stack app-wide -- every existing
        // component already renders through the default font-sans, so no
        // per-component class changes are needed.
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
