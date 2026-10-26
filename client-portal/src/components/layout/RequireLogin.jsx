import { Navigate } from "react-router-dom";
import { isLoggedIn } from "../../services/applicationState";

// Wraps every /:regime/... route so the client can only get in through the
// link their RM emailed (ContinueFromLink.jsx sets the session).
export default function RequireLogin({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" replace />;
}
