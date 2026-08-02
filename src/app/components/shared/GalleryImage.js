export default function GalleryImage({ image, className = '', loading = 'lazy' }) {
  const alt = image.alt || 'Hoa Phuong Do gallery image'

  return (
    // Gallery uploads are compressed WebP/JPEG files; native sizing preserves mixed orientations.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image.src} alt={alt} loading={loading} decoding="async" className={className} />
  )
}
