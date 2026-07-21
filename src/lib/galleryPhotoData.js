export const galleryPhotoSelect = {
  id: true,
  src: true,
  alt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
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

export function serializeGalleryPhoto(photo) {
  return {
    id: photo.id,
    src: photo.src,
    alt: photo.alt,
    status: photo.status,
    createdAt: photo.createdAt,
    updatedAt: photo.updatedAt,
    asset: photo.asset,
  };
}
