import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StepFooter from "../../components/layout/StepFooter";
import IneligibleModal from "./IneligibleModal";
import IdentityResultView from "./IdentityResultView";
import CameraCapture from "../../components/ui/CameraCapture";
import MethodTabBar from "../../components/ui/MethodTabBar";
import UploadDropzone from "../../components/ui/UploadDropzone";
import CapturePrompt from "../../components/ui/CapturePrompt";
import useIsMobile from "../../hooks/useIsMobile";
import api from "../../services/api";
import { viewLocalFile } from "../../services/viewDocument";
import {
  setPanNumber as storePanNumber,
  getPanNumber,
  setPrefillEmail,
  getAccountType,
  getBasePath,
  getHasAadhaar,
  getRmEmail,
} from "../../services/applicationState";

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const PAN_METHODS = [
  { id: "upload", label: "Upload PAN Card" },
  { id: "capture", label: "Capture Photo" },
];

// Sends the browser to Setu's DigiLocker page (Aadhaar number, OTP,
// DigiLocker PIN); Setu brings it back to this page with ?success=&id=.
async function goToDigilocker(pan) {
  const redirectUrl = `${window.location.origin}${getBasePath()}/identity`;
  const { data } = await api.post(`/identity/${pan}/digilocker`, { redirectUrl });
  window.location.assign(data.url);
}

// PAN + DOB -> "Verify & continue" checks the PAN with the Income Tax
// Department. A client with Aadhaar then goes through DigiLocker and comes
// back here to review both; one without reviews the PAN details only.
export default function IdentityKraStep({ onNext, onBack }) {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [panNumber, setPanNumber] = useState("");
  const [dob, setDob] = useState("");
  const [file, setFile] = useState(null);
  const [panMethod, setPanMethod] = useState("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ineligibleReason, setIneligibleReason] = useState(null); // "existing_client"
  const [showCamera, setShowCamera] = useState(false);
  const [result, setResult] = useState(null); // { itrData, aadhaarData } once there's something to review
  const [digilockerError, setDigilockerError] = useState(""); // DigiLocker came back without the Aadhaar details
  const [fetchingAadhaar, setFetchingAadhaar] = useState(false);
  const digilockerHandled = useRef(false);

  // Back from DigiLocker: fetch the Aadhaar details for review.
  useEffect(() => {
    const requestId = searchParams.get("id");
    const success = searchParams.get("success");
    if (!requestId || !success || digilockerHandled.current) return;
    digilockerHandled.current = true;
    const errMessage = searchParams.get("errMessage");
    setSearchParams({}, { replace: true });

    const pan = getPanNumber();
    if (!pan) return;
    setPanNumber(pan);
    if (success.toLowerCase() !== "true") {
      setDigilockerError(errMessage || "DigiLocker verification was cancelled.");
      return;
    }
    setFetchingAadhaar(true);
    api
      .post(`/identity/${pan}/digilocker/complete`, { requestId })
      .then(({ data }) => {
        setPrefillEmail(data.prefillEmail);
        setResult({ itrData: data.itrData, aadhaarData: data.aadhaarData });
      })
      .catch((err) => setDigilockerError(err.response?.data?.message || "Could not fetch the Aadhaar details."))
      .finally(() => setFetchingAadhaar(false));
  }, [searchParams, setSearchParams]);

  const retryDigilocker = async () => {
    setLoading(true);
    setDigilockerError("");
    try {
      await goToDigilocker(getPanNumber());
    } catch (err) {
      setDigilockerError(err.response?.data?.message || "Could not start DigiLocker. Please try again.");
      setLoading(false);
    }
  };

  const INELIGIBLE_COPY = {
    // from the existing-client check (TechExcel data): the PAN already has an NRI account
    existing_client: {
      title: "Already an Aionion Capital NRI client",
      message: "This PAN already has an NRI account with Aionion Capital, so a new NRI account can't be opened for it.",
    },
  };

  // Hold the upload until identity verification completes. OCR is not required.
  const selectPanFile = (selected) => {
    if (!selected) return;
    setError("");
    setFile(null);
    if (!["image/jpeg", "image/png"].includes(selected.type)) {
      setError("Upload a JPG, JPEG or PNG image.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError("PAN card image must be 5 MB or smaller.");
      return;
    }
    setFile(selected);
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    e.target.value = "";
    selectPanFile(selected);
  };

  const removePanFile = () => {
    setFile(null);
    setError("");
  };

  const handleCameraCapture = (capturedFile) => {
    setShowCamera(false);
    selectPanFile(capturedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanPan = panNumber.trim().toUpperCase();
    if (!PAN_REGEX.test(cleanPan)) {
      setError("Enter a valid PAN (e.g. ABCDE1234F).");
      return;
    }
    if (!dob) {
      setError("Date of birth is required.");
      return;
    }
    if (!file) {
      setError("Please upload your PAN card image.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/identity/verify", {
        panNumber: cleanPan,
        dob,
        accountType: getAccountType(),
        hasAadhaar: getHasAadhaar(),
        rmEmail: getRmEmail(),
      });

      if (data.existingClient) {
        setIneligibleReason("existing_client");
        return;
      }

      if (!data.eligible) {
        // PAN not found / invalid with the Income Tax Department -- nothing
        // is uploaded; the RM can correct the PAN and verify again.
        setError(data.message || "This PAN couldn't be verified with the Income Tax Department.");
        return;
      }

      // PAN is confirmed valid now -- persist the held file for real.
      const formData = new FormData();
      formData.append("file", file);
      formData.append("panNumber", cleanPan);
      formData.append("documentType", "pan_card");
      await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      storePanNumber(cleanPan);
      // Cleared so a stale email from an earlier PAN never carries over;
      // DigiLocker's email (if any) is filled in when it comes back.
      setPrefillEmail(null);

      if (data.needsDigilocker) {
        await goToDigilocker(cleanPan); // leaves the page
        return;
      }
      setResult({ itrData: data.itrData, aadhaarData: null });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to verify PAN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-8">
        {result ? (
          <IdentityResultView
            panNumber={panNumber}
            itrData={result.itrData}
            aadhaarData={result.aadhaarData}
            onContinue={onNext}
          />
        ) : digilockerError || fetchingAadhaar ? (
          <div>
            <p className="text-xs font-semibold tracking-wide text-pink-500">DIGILOCKER</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Aadhaar verification</h2>
            {digilockerError ? (
              <>
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{digilockerError}</p>
                <div className="mt-8 flex justify-end border-t border-slate-100 pt-6">
                  <Button disabled={loading} onClick={retryDigilocker}>
                    {loading ? "Opening DigiLocker…" : "Try DigiLocker again"}
                  </Button>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-500">Fetching the Aadhaar details from DigiLocker…</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-4">
              <div>
                <p className="text-xs font-semibold tracking-wide text-pink-500">LET'S BEGIN</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Verify your identity</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {getHasAadhaar()
                    ? "We'll verify the PAN with the Income Tax Department, then fetch the Aadhaar details from DigiLocker."
                    : "We'll verify the PAN with the Income Tax Department."}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Permanent Account Number (PAN)"
                  required
                  value={panNumber}
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  suffix="PAN"
                  helperText="Enter the 10-character PAN exactly as printed"
                  onChange={(e) => {
                    setPanNumber(e.target.value.toUpperCase());
                  }}
                />
                <Input
                  label="Date of birth"
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-700">
                    Upload PAN card<span className="ml-0.5 text-pink-500">*</span>
                  </label>
                  <Badge tone="blue">REQUIRED</Badge>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                  Upload a clear copy showing your photograph, PAN number, name and date of birth.
                </p>

                {isMobile && <MethodTabBar methods={PAN_METHODS} active={panMethod} onChange={setPanMethod} />}

                <div className={isMobile ? "mt-3" : ""}>
                  {panMethod === "capture" && isMobile ? (
                    <CapturePrompt
                      title="Capture PAN Card"
                      subtitle="Use your camera to take a photo"
                      fileName={file?.name}
                      onOpenCamera={() => setShowCamera(true)}
                    />
                  ) : (
                    <UploadDropzone
                      title="Choose PAN Card"
                      subtitle="JPG, JPEG or PNG up to 5 MB"
                      fileName={file?.name}
                      onChange={handleFileChange}
                      onRemove={removePanFile}
                      onView={file ? () => viewLocalFile(file) : undefined}
                    />
                  )}
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <StepFooter
                onBack={onBack}
                submitLabel={loading ? "Verifying…" : "Verify & continue"}
                loading={loading}
              />
            </form>
          </>
        )}
      </Card>

      <IneligibleModal
        open={!!ineligibleReason}
        title={ineligibleReason ? INELIGIBLE_COPY[ineligibleReason].title : ""}
        message={ineligibleReason ? INELIGIBLE_COPY[ineligibleReason].message : ""}
      />
      {showCamera && (
        <CameraCapture title="Capture PAN card" onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />
      )}
    </>
  );
}
