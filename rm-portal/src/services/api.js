import axios from "axios";

// The backend address comes from VITE_API_BASE_URL: .env locally,
// .env.production (or an Amplify environment variable) for the live build.
// The localhost fallback is for `npm run dev` only, never a live build.
const baseURL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5077/api" : "");
if (!baseURL) console.error("VITE_API_BASE_URL is not set -- the portal can't reach the backend.");

const api = axios.create({ baseURL });

export default api;
