/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0023FF",
          pink: "#FE667C",
        },
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #4338ca 0%, #db2777 100%)",
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
