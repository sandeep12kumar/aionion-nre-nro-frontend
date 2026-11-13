import axios from "axios";
import api from "../services/api";

// The video IPV call's requests are signed in by the call token (the
// client's or the RM's -- server: controllers/ipvController.js).
export function ipvApi(token) {
  return axios.create({ baseURL: api.defaults.baseURL, headers: { "x-ipv-token": token } });
}

export const errorMessage = (err, fallback = "Something went wrong. Please try again.") =>
  err?.response?.data?.message || err?.message || fallback;
