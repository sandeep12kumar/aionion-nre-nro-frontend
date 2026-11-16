import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import api from "../../services/api";
import { getPanNumber, getBasePath } from "../../services/applicationState";
import { prevStepPath } from "../stepsConfig";

// Setu needs the signer's location at sign time.
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser doesn't support location access, which is required to e-sign."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => reject(new Error("Please allow location access — your current location is required to e-sign.")),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

// Aadhaar e-sign via Setu -- for clients whose RM answered "Yes" to "Do you
// have an Aadhaar card?" (the E-sign step goes straight to /submit for
// everyone else). "Sign with Aadhaar" sends the client to Setu's Aadhaar OTP
// page; Setu redirects back here with ?esign_return=1, and loading the
// status asks the server to check with Setu and fetch the signed PDF. Once
// it's signed, the client goes straight on to /submit (application
// submitted -> Happy Investing -> aionioncapital.com).
export default function EsignStep() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const panNumber = getPanNumber();
  const returnedFromSetu = searchParams.get("esign_return") === "1";

  const [esign, setEsign] = useState(null);
  const [checking, setChecking] = useState(true);
  const [consent, setConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState("");

  const signed = esign?.status === "completed";
  const pending = esign?.status === "pending";

  const refreshStatus = async () => {
    if (!panNumber) return;
    setChecking(true);
    setError("");
    try {
      const { data } = await api.get(`/esign/${panNumber}`);
      setEsign(data.esign);
      if (data.esign?.status === "completed") {
        navigate(`${getBasePath()}/submit`, { replace: true }); // submits the application
        return;
      }
      if (["name_mismatch", "name_unverifiable", "failed"].includes(data.esign?.status)) {
        setError(data.esign.message || "The e-sign could not be completed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to check the e-sign status.");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panNumber]);

  const startEsign = async () => {
    setError("");
    if (!consent) {
      setError("Please give your consent to sign with Aadhaar.");
      return;
    }
    setSigning(true);
    try {
      // Best effort: without a browser location the server uses the live
      // photo's location (or the default), so e-sign is never blocked by it.
      const location = await getCurrentLocation().catch(() => ({}));
      const { data } = await api.post(`/esign/${panNumber}/initiate`, { ...location, consent: true });
      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }
      if (data.completed) await refreshStatus();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to start Aadhaar e-sign.");
    } finally {
      setSigning(false);
    }
  };


  return (
    <OnboardingShell currentStepId="esign">
      <Card className="p-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-pink-500">AADHAAR E-SIGN</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Sign your application</h2>
          <p className="mt-1 text-sm text-slate-500">
            You'll be taken to our e-sign partner (Setu) to sign your account opening form with the OTP sent to your
            Aadhaar-linked mobile number, then brought back here.
          </p>
        </div>

        <div className="mt-8 space-y-5">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
            {checking || signed ? (
              <p className="text-sm text-slate-500">
                {signed ? "E-signed — submitting your application…" : returnedFromSetu ? "Confirming your e-sign…" : "Checking e-sign status…"}
              </p>
            ) : (
              <>
                {pending && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">
                      Your e-sign hasn't been completed yet. If you've just signed, check again in a moment.
                    </p>
                    <button type="button" className="text-sm font-semibold text-brand-blue" onClick={refreshStatus}>
                      Check status again
                    </button>
                  </div>
                )}
                <label className="flex max-w-lg items-start gap-3 text-left text-sm text-slate-600">
                  <input type="checkbox" className="mt-0.5" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  I consent to using my Aadhaar number and OTP to electronically sign this application, for the sole
                  purpose of opening my account with Aionion Capital.
                </label>
                <Button type="button" onClick={startEsign} disabled={signing}>
                  {signing ? "Preparing your document…" : pending ? "Sign with Aadhaar again" : "Sign with Aadhaar"}
                </Button>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex border-t border-slate-100 pt-6">
            <Button type="button" variant="outline" onClick={() => navigate(prevStepPath("esign"))}>
              ← Back
            </Button>
          </div>
        </div>
      </Card>
    </OnboardingShell>
  );
}
