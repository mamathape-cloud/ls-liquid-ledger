export async function downloadFile(url: string, filename?: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) {
    let message = "Download failed";
    try {
      const json = await res.json();
      message = json.message || message;
    } catch {
      // response may not be JSON
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const resolvedName = filename || match?.[1] || "download";

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = resolvedName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
