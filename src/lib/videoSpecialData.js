export const videoSpecialSelect = {
  id: true,
  title: true,
  description: true,
  videoUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  assetId: true,
  asset: {
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      url: true,
    },
  },
};

export function serializeVideoSpecial(video) {
  return {
    id: video.id,
    title: video.title,
    description: video.description,
    videoUrl: video.videoUrl,
    status: video.status,
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    asset: video.asset ? {
      id: video.asset.id,
      fileName: video.asset.fileName,
      mimeType: video.asset.mimeType,
      sizeBytes: video.asset.sizeBytes,
      url: video.asset.url,
    } : null,
  };
}
