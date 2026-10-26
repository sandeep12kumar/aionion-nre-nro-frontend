import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingShell from "../../components/layout/OnboardingShell";
import Card from "../../components/ui/Card";
import StepFooter from "../../components/layout/StepFooter";
import { CheckCircleIcon } from "../../components/ui/icons";
import api from "../../services/api";
import { getPanNumber } from "../../services/applicationState";
import { nextStepPath, prevStepPath } from "../stepsConfig";

const SCHEMES = {
  lifeTime: { label: "Life Time Advantage", note: "(No AMC)" },
  annualCare: { label: "Annual Care", note: "(AMC: ₹499 + GST from 2nd year onwards)" },
};
const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

// Loads Razorpay Checkout once and resolves when window.Razorpay is ready.
// A second call while the first <script> is still in flight waits on the
// same element rather than injecting another.
function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);

    const existing = document.querySelector(`script[src="${RAZORPAY_CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay Checkout")));
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_CHECKOUT_SRC;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay Checkout"));
    document.body.appendChild(script);
  });
}

// The RM chose the scheme in rm-portal; the client pays for it here.
export default function PaymentStep() {
  const panNumber = getPanNumber();
  const navigate = useNavigate();

  const [scheme, setScheme] = useState(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [personal, setPersonal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!panNumber) return;
    Promise.all([
      api.get(`/identity/${panNumber}`),
      api.get(`/personal-details/${panNumber}`),
      api.get(`/scheme/${panNumber}`),
      api.get(`/payment/${panNumber}`),
    ]).then(([identityRes, personalRes, schemeRes, paymentRes]) => {
      setIdentity(identityRes.data.identity);
      setPersonal(personalRes.data.personalDetails);
      setScheme(schemeRes.data.scheme);
      setAlreadyPaid(paymentRes.data.payment?.status === "success");
    });
    // Warm the Checkout script up front so "Pay Now" opens the modal instantly.
    loadRazorpayCheckout().catch(() => {});
  }, [panNumber]);

  const schemeInfo = SCHEMES[scheme?.scheme_key] || { label: scheme?.scheme_key, note: "" };
  const baseAmount = Number(scheme?.base_amount || 0);
  const gst = Number(scheme?.gst_amount || 0);
  const total = Number(scheme?.total_amount || 0);

  const handlePay = async (e) => {
    e.preventDefault();
    setError("");

    if (alreadyPaid) {
      navigate(nextStepPath("payment"));
      return;
    }
    if (!scheme || total <= 0) {
      setError("No scheme has been selected yet. Please contact your Relationship Manager.");
      return;
    }

    const firstname = personal?.full_name || identity?.full_name || "";
    const email = identity?.email || "";
    if (!firstname || !email) {
      setError(
        !email
          ? "We don't have your verified email yet — please contact your Relationship Manager."
          : "We don't have your name yet — please contact your Relationship Manager.",
      );
      return;
    }

    setLoading(true);

    try {
      const phone = personal?.phone_number
        ? `${(personal.phone_country_code || "").replace(/\D/g, "")}${personal.phone_number}`
        : "";

      const { data: order } = await api.post("/payment/order", {
        panNumber,
        amount: total.toFixed(2),
        firstname,
        email,
        phone,
      });

      // Dev-only: server has PAYMENTS_DEV_BYPASS on, so there's no real
      // Razorpay order — mark it paid server-side and move straight on.
      if (order.devBypass) {
        const { data: result } = await api.post("/payment/dev-complete", { orderId: order.orderId });
        const basePath = result.basePath || "/nro";
        navigate(`${basePath}/payment-complete?pan=${result.panNumber}&code=${result.clientCode}`);
        return;
      }

      const Razorpay = await loadRazorpayCheckout();

      // order.noOrder === true when the server ran Checkout without the
      // Orders API (see paymentController.createOrder). Then there's no
      // order_id and the success handler carries only razorpay_payment_id;
      // /verify reconciles against order.txnId instead of a signature.
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.productinfo,
        prefill: {
          name: order.prefill?.name || firstname,
          email: order.prefill?.email || email,
          contact: order.prefill?.contact || phone,
        },
        notes: order.notes || undefined,
        theme: { color: "#4f46e5" },
        modal: {
          ondismiss: () => {
            setError("Payment was cancelled before it completed. You can try again.");
            setLoading(false);
          },
        },
        handler: async (response) => {
          try {
            const { data: result } = await api.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              txnId: order.txnId,
            });
            const basePath = result.basePath || "/nro";
            navigate(`${basePath}/payment-complete?pan=${result.panNumber}&code=${result.clientCode}`);
          } catch (verifyErr) {
            setError(verifyErr.response?.data?.message || "We couldn't verify your payment. Please contact support.");
            setLoading(false);
          }
        },
      };
      if (!order.noOrder) options.order_id = order.orderId;

      const rzp = new Razorpay(options);

      rzp.on("payment.failed", async (response) => {
        try {
          await api.post("/payment/failed", {
            orderId: order.orderId || order.txnId,
            error: response.error || null,
          });
        } catch {
          // best-effort — the row is still reconciled by the webhook
        }
        setError(response.error?.description || "Your payment could not be completed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to start payment.");
      setLoading(false);
    }
  };

  return (
    <OnboardingShell currentStepId="payment">
      <Card className="p-8">
        <div className="flex items-start gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-pink-500">ACCOUNT OPENING CHARGES</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">Complete your payment</h2>
            <p className="mt-1 text-sm text-slate-500">Pay for the scheme your Relationship Manager selected to activate your account.</p>
          </div>
        </div>

        <form onSubmit={handlePay} className="mt-8 space-y-6">
          {scheme ? (
            <div className="rounded-2xl border border-brand-blue bg-indigo-50/50 p-5 ring-1 ring-brand-blue">
              <p className="text-xs font-semibold tracking-wide text-pink-500">SELECTED SCHEME</p>
              <p className="mt-1 text-base font-bold text-slate-900">{schemeInfo.label}</p>
              <p className="mt-2 text-2xl font-bold text-brand-blue">
                ₹{baseAmount} <span className="text-sm font-medium text-slate-400">+ GST</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">{schemeInfo.note}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading your scheme…</p>
          )}

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Base amount</span>
              <span className="font-medium text-slate-800">₹{baseAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">GST (18%)</span>
              <span className="font-medium text-slate-800">₹{gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
              <span className="font-semibold text-slate-800">Total payable</span>
              <span className="font-bold text-brand-blue">₹{total.toFixed(2)}</span>
            </div>
          </div>

          {alreadyPaid && (
            <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              <CheckCircleIcon className="h-5 w-5" aria-hidden="true" /> Payment already completed.
            </p>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <StepFooter
            onBack={() => navigate(prevStepPath("payment"))}
            submitLabel={alreadyPaid ? "Continue" : "Pay Now"}
            loading={loading}
            disabled={!scheme}
          />
        </form>
      </Card>
    </OnboardingShell>
  );
}
