import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RequireLogin from "./components/layout/RequireLogin";
import { applyRegimeTheme, isLoggedIn } from "./services/applicationState";
import RmLoginStep from "./steps/00-rm-login/RmLoginStep";
import IpvStep from "./steps/00-ipv/IpvStep";
import AccountTypeStep from "./steps/00-account-type/AccountTypeStep";
import AadhaarStep from "./steps/00-aadhaar/AadhaarStep";
import IdentityStep from "./steps/01-identity-kra/IdentityStep";
import BankProofsStep from "./steps/04-bank-proofs/BankProofsStep";
import AddressProofsStep from "./steps/05-address-proofs/AddressProofsStep";
import PersonalNomineeStep from "./steps/03-personal-profile/PersonalNomineeStep";
import SchemeLinkStep from "./steps/06-scheme-link/SchemeLinkStep";

// /ipv only needs the RM's login (the IPV is the first step). This must be a
// component: its check runs every time the route is shown. Written inline in
// App ("isLoggedIn() ? ... : <Navigate>") it was worked out once, when the page
// first loaded -- so after a fresh login the RM was sent back to the login page.
function RequireRmLogin({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" replace />;
}

// rm-portal: the Relationship Manager's half of the NRI onboarding.
//   RM Login -> Video IPV (client joins from the emailed link) -> Account type (NRE / NRO) -> Aadhaar check -> Identity & Contact ->
//   Bank & proofs -> Address proofs -> Personal & Nominee -> Scheme (+ client
//   signature when no Aadhaar) -> Send link to client.
// The emailed link opens client-portal, which handles Review, Payment,
// Live photo, E-sign and PDF submission.
//
// :regime is /nre or /nro, mirroring the account type chosen at
// /account-type (see applicationState.getBasePath). Deep-link a merged
// step's phase with ?phase=<name>. Every route after login is wrapped in
// RequireLogin: /:regime/... routes need the account type chosen, and all
// but the Aadhaar check also need that question answered first.
export default function App() {
  // Re-applies the chosen regime's solid brand color on every fresh page
  // load (e.g. a mid-flow refresh).
  useEffect(() => {
    applyRegimeTheme();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<RmLoginStep />} />
      <Route path="/ipv" element={<RequireRmLogin><IpvStep /></RequireRmLogin>} />
      <Route path="/account-type" element={<RequireLogin><AccountTypeStep /></RequireLogin>} />
      <Route path="/:regime/aadhaar" element={<RequireLogin><AadhaarStep /></RequireLogin>} />
      <Route path="/:regime/identity" element={<RequireLogin requireAadhaar><IdentityStep /></RequireLogin>} />
      <Route path="/:regime/bank" element={<RequireLogin requireAadhaar><BankProofsStep /></RequireLogin>} />
      <Route path="/:regime/address" element={<RequireLogin requireAadhaar><AddressProofsStep /></RequireLogin>} />
      <Route path="/:regime/profile" element={<RequireLogin requireAadhaar><PersonalNomineeStep /></RequireLogin>} />
      <Route path="/:regime/scheme" element={<RequireLogin requireAadhaar><SchemeLinkStep /></RequireLogin>} />
      <Route path="*" element={<RmLoginStep />} />
    </Routes>
  );
}
