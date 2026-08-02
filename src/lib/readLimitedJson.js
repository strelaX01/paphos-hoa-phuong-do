export async function readLimitedJson(request, maximumBytes = 4096) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maximumBytes) {
    return { error: "Request body is too large.", status: 413 };
  }

  if (!request.body) return { error: "Invalid request body.", status: 400 };

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        return { error: "Request body is too large.", status: 413 };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { data: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return { error: "Invalid request body.", status: 400 };
  }
}
