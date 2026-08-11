/**
 * Robustly parse a multipart/form-data request body.
 *
 * On the serverless (OpenNext/Lambda + CloudFront) path, `request.formData()`
 * occasionally throws `TypeError: no boundary found in multipart body` because
 * the `boundary=` parameter is missing from the reconstructed Content-Type
 * header. This helper tries the native parse first, and on failure recovers the
 * boundary from the raw body's opening delimiter and re-parses.
 */
export async function parseFormData(request: Request): Promise<FormData> {
  try {
    // Parse a clone so, if it throws, the original body is still readable.
    return await request.clone().formData();
  } catch {
    const buf = Buffer.from(await request.arrayBuffer());
    let contentType = request.headers.get("content-type") || "";

    if (
      contentType.includes("multipart/form-data") &&
      !/boundary=/i.test(contentType)
    ) {
      // A multipart body starts with `--<boundary>\r\n`; recover it.
      const crIdx = buf.indexOf(0x0d); // first CR
      const firstLine = buf
        .subarray(0, crIdx > 0 ? crIdx : 0)
        .toString("latin1");
      if (firstLine.startsWith("--")) {
        contentType = `multipart/form-data; boundary=${firstLine.slice(2)}`;
      }
    }

    return await new Response(buf, {
      headers: { "content-type": contentType },
    }).formData();
  }
}
