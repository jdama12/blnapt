type ImagePlaceholderProps = {
  label: string
  variant?: 'hero' | 'landscape' | 'card'
}

export default function ImagePlaceholder({ label, variant = 'landscape' }: ImagePlaceholderProps) {
  return (
    <div className={`home-image-placeholder is-${variant}`} role="img" aria-label={`${label} 이미지가 들어갈 영역`}>
      <div className="home-building-silhouette" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
      <small>실제 단지 사진으로 교체할 수 있습니다</small>
    </div>
  )
}
