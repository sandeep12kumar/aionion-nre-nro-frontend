import { Navigate, useParams } from "react-router-dom";
import { isLoggedIn, getHasAadhaar, getBasePath, hasChosenAccountType } from "../../services/applicationState";

// Wraps the RM routes so a direct or bookmarked URL can't skip the RM's
// email+OTP login (RmLoginStep.jsx) or the steps that must come first:
//   Account type (NRE/NRO) -> every /:regime/... route
//   Aadhaar answer         -> routes with requireAadhaar, since it decides
//                             whether the RM collects a signature at the end
export default function RequireLogin({ requireAadhaar = false, children }) {
  const { regime } = useParams();
  if (!isLoggedIn()) return <Navigate to="/" replace />;
  if (regime !== undefined && !hasChosenAccountType()) return <Navigate to="/account-type" replace />;
  // keep the URL's /nre or /nro in step with the chosen account type
  if (regime !== undefined && `/${regime}` !== getBasePath()) return <Navigate to="/account-type" replace />;
  if (requireAadhaar && getHasAadhaar() === null) return <Navigate to={`${getBasePath()}/aadhaar`} replace />;
  return children;
}
