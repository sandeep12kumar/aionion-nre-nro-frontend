import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import { clearApplication } from "../../services/applicationState";
import { useNavigate } from "react-router-dom";

// Shown when TechExcel says the PAN is already an Aionion client -- a
// permanent, session-ending block for this PAN.
export default function IneligibleModal({ open, title, message }) {
  const navigate = useNavigate();

  const startOver = () => {
    clearApplication();
    navigate(0);
  };

  return (
    <Modal open={open} title={title}>
      <p>{message}</p>
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={startOver}>
          Start over
        </Button>
      </div>
    </Modal>
  );
}
