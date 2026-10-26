import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import StepFooter from "../../components/layout/StepFooter";
import LivenessCapture from "../../components/ui/LivenessCapture";
import { CheckCircleIcon } from "../../components/ui/icons";
import api from "../../services/api";
import { getPanNumber } from "../../services/applicationState";

// "Continue" (on to E-sign) needs the live photo to be captured first. The
// server enforces the same before starting the e-sign
// (controllers/esignController.js) and before final submission
// (services/applicationCompletion.js).
const LIVE_PHOTO_REQUIRED = true;

export default function LivePhotoCaptureStep({ onNext, onBack }) {
  const navigate = useNavigate();
  const panNumber = getPanNumber();

  const [savedLocation, setSavedLocation] = useState(null);
  const [captured, setCaptured] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // A missing PAN here means the session's identity was never set (a fresh
  // tab, cleared storage, or an expired session) -- without this guard the
  // step still renders normally and only fails once the applicant tries to
  // upload, surfacing a confusing raw "No record found for this PAN" error
  // instead of sending them back to where the PAN is actually captured.
  useEffect(() => {
    if (!panNumber) navigate("/", { replace: true });
  }, [panNumber, navigate]);

  useEffect(() => {
    if (!panNumber) return;
    api.get(`/documents/${panNumber}`).then(({ data }) => {
      const photo = data.documents.find((d) => d.document_type === "live_photo");
      setCaptured(!!photo);
      setSavedLocation(photo || null);
    });
  }, [panNumber]);

  if (!panNumber) return null;

  // meta = { liveness, location } from LivenessCapture -- liveness is the
  // challenge trace, location is the mandatory GPS fix.
  const handleCapture = async (file, meta) => {
    setShowCamera(false);
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("panNumber", panNumber);
      formData.append("documentType", "live_photo");
      formData.append("latitude", meta.location.latitude);
      formData.append("longitude", meta.location.longitude);
      formData.append("locationAccuracy", meta.location.accuracy ?? "");
      formData.append("liveness", JSON.stringify(meta.liveness));

      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setCaptured(true);
      setSavedLocation(data.document);
    } catch (err) {
      if (err.response?.status === 404) {
        navigate("/", { replace: true });
        return;
      }
      setError(err.response?.data?.message || "Failed to save the photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (LIVE_PHOTO_REQUIRED && !captured) {
      setError("Please capture your live photo before continuing.");
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/identity/${panNumber}/progress`, { currentStep: "review_sign" });
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to continue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="p-8">
        <div className="flex items-start gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-pink-500">FACE VERIFICATION</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Live photo capture</h2>
            <p className="mt-1 text-sm text-slate-500">
              Look at the camera for a 2-second clip — only you should be in the frame. The clearest frame is used as your photo.
              Your location is recorded at capture time, so allow location and camera access when prompted.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
            {captured ? (
              <>
                <CheckCircleIcon className="h-14 w-14 text-emerald-500" />
                <p className="text-sm font-semibold text-slate-800">Live photo captured</p>
                {savedLocation?.latitude != null && savedLocation?.longitude != null && (
                  <div className="space-y-1 text-sm text-slate-600">
                    <p className="font-semibold">Capture location (GPS)</p>
                    <p>Latitude: {Number(savedLocation.latitude).toFixed(6)}</p>
                    <p>Longitude: {Number(savedLocation.longitude).toFixed(6)}</p>
                    {savedLocation.location_accuracy != null && <p>Accuracy: {Math.round(Number(savedLocation.location_accuracy))} m</p>}
                    <a className="text-brand-blue underline" href={`https://www.google.com/maps?q=${savedLocation.latitude},${savedLocation.longitude}`} target="_blank" rel="noreferrer">View location on map</a>
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => setShowCamera(true)} disabled={uploading}>
                  Retake photo
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">No photo captured yet</p>
                <Button type="button" onClick={() => setShowCamera(true)} disabled={uploading}>
                  {uploading ? "Uploading…" : "Start liveness check"}
                </Button>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter onBack={onBack} submitLabel="Continue" loading={loading} disabled={LIVE_PHOTO_REQUIRED && !captured} />
        </form>
      </Card>

      {showCamera && (
        <LivenessCapture
          title="Capture live photo"
          onCapture={handleCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
