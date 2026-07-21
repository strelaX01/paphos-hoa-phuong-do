const allowedStatuses = new Set(["DRAFT", "PUBLISHED", "ARCHIVED"]);

function isValidMediaUrl(value) {
  if (!value) return false;
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateVideoSpecialInput(input, { partial = false } = {}) {
  const errors = {};
  const data = {};

  if (!partial || Object.hasOwn(input || {}, "title")) {
    const title = typeof input?.title === "string" ? input.title.trim() : "";
    if (!title) errors.title = "Video title is required.";
    else if (title.length > 120) errors.title = "Video title must be 120 characters or fewer.";
    else data.title = title;
  }

  if (!partial || Object.hasOwn(input || {}, "videoUrl")) {
    const videoUrl = typeof input?.videoUrl === "string" ? input.videoUrl.trim() : "";
    if (!videoUrl) errors.videoUrl = "Video URL is required.";
    else if (videoUrl.length > 1000 || !isValidMediaUrl(videoUrl)) errors.videoUrl = "Video URL is invalid.";
    else data.videoUrl = videoUrl;
  }

  if (Object.hasOwn(input || {}, "description")) {
    const description = typeof input.description === "string" ? input.description.trim() : "";
    if (description.length > 500) errors.description = "Description must be 500 characters or fewer.";
    else data.description = description || null;
  } else if (!partial) {
    data.description = null;
  }

  if (Object.hasOwn(input || {}, "status")) {
    const status = typeof input.status === "string" ? input.status.trim().toUpperCase() : "";
    if (!allowedStatuses.has(status)) errors.status = "Status is invalid.";
    else data.status = status;
  } else if (!partial) {
    data.status = "PUBLISHED";
  }

  return {
    data,
    errors,
    isValid: Object.keys(errors).length === 0,
  };
}

export function readVideoAssetMetadata(input) {
  const fileName = typeof input?.fileName === "string" ? input.fileName.trim().slice(0, 255) : null;
  const mimeType = typeof input?.mimeType === "string" ? input.mimeType.trim().slice(0, 120) : null;
  const rawSize = Number(input?.sizeBytes);
  const sizeBytes = Number.isInteger(rawSize) && rawSize >= 0 ? rawSize : null;

  return { fileName: fileName || null, mimeType: mimeType || null, sizeBytes };
}
