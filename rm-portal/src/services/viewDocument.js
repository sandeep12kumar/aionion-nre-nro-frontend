import api from "./api";

// Opens an uploaded document (as stored on the server) in a new browser tab.
// The timestamp makes sure a replaced file never shows the old one.
export function viewStoredDocument(panNumber, documentType) {
  window.open(`${api.defaults.baseURL}/documents/${panNumber}/${documentType}/file?t=${Date.now()}`, "_blank", "noopener");
}

// Opens a file picked in the browser but not uploaded yet (e.g. the PAN card,
// which is uploaded only once the PAN is verified).
export function viewLocalFile(file) {
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
