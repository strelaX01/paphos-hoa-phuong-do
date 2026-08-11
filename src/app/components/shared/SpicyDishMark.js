import Image from 'next/image'

export default function SpicyDishMark({ compact = false, className = '' }) {
  return (
    <span
      className={`spicy-dish-mark spicy-dish-mark--corner ${compact ? 'spicy-dish-mark--compact' : ''} ${className}`}
      aria-label="Spicy dish"
      title="Spicy dish"
    >
      <span className="spicy-dish-mark__flames" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="spicy-dish-mark__heat" aria-hidden="true" />
      <span className="spicy-dish-mark__image" aria-hidden="true">
        <Image src="/images/spicy.png" alt="" fill sizes="32px" className="object-cover mix-blend-multiply" />
      </span>
      <span className="spicy-dish-mark__label">{compact ? 'Spicy' : 'Spicy dish'}</span>
    </span>
  )
}
