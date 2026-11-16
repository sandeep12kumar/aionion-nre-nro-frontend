import { ipvApi } from "./ipvApi";

function save(href, fileName) {
  const a = document.createElement("a");
  a.href = href;
  a.download = fileName;
  a.click();
}

// The IPV report PDF (GET /ipv/report with the RM's call token).
export async function downloadIpvReport(token, name) {
  const { data } = await ipvApi(token).get("/ipv/report", { responseType: "blob" });
  const url = URL.createObjectURL(data);
  save(url, `IPV_${name}.pdf`);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// A part of the call recording. S3: the backend answers with a signed link;
// locally with the file itself.
export async function downloadIpvRecording(token, name, segment) {
  try {
    const { data: body } = await ipvApi(token).get("/ipv/recording", { params: { segment }, responseType: "blob" });
    if (body.type.includes("json")) {
      const { url, fileName } = JSON.parse(await body.text());
      save(url, fileName);
    } else {
      const url = URL.createObjectURL(body);
      save(url, `IPV_${name}${segment > 1 ? `_part${segment}` : ""}.${body.type.includes("mp4") ? "mp4" : "webm"}`);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  } catch (err) {
    // errors come back as a Blob too
    if (err.response?.data instanceof Blob) {
      try {
        err.message = JSON.parse(await err.response.data.text()).message || err.message;
      } catch {
        /* not a JSON error */
      }
    }
    throw err;
  }
}
