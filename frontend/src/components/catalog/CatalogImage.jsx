import { useEffect, useState } from 'react'

export default function CatalogImage({
  src,
  alt,
  placeholder,
  containerClassName = '',
  imageClassName = '',
  placeholderClassName = '',
  style,
  loading = 'lazy',
  decoding = 'async',
}) {
  const [showImage, setShowImage] = useState(Boolean(src))

  useEffect(() => {
    setShowImage(Boolean(src))
  }, [src])

  return (
    <div className={`relative overflow-hidden ${containerClassName}`.trim()} style={style}>
      <div
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center ${placeholderClassName}`.trim()}
      >
        {placeholder}
      </div>
      {showImage && src ? (
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding={decoding}
          className={`relative z-[1] h-full w-full ${imageClassName}`.trim()}
          onError={() => setShowImage(false)}
        />
      ) : null}
    </div>
  )
}
