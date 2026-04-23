const CATEGORY_PATH_SEGMENT_OVERRIDES = {
  'Kids & Baby': 'Kids and Baby',
}

function buildCatalogUrl(...segments) {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const encodedPath = segments.filter(Boolean).map(encodeCatalogPathSegment).join('/')

  return `${base}/${encodedPath}`.replace(/^\/\//, '/')
}

function encodeCatalogPathSegment(segment) {
  // Vite serves filenames containing "&" only when the ampersand remains literal in the path.
  return encodeURIComponent(segment).replace(/%26/g, '&')
}

function toImageId(value) {
  return (
    String(value || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'image'
  )
}

export function getCategoryImageUrl(categoryTitle) {
  if (!categoryTitle) return null
  const categoryPathSegment = CATEGORY_PATH_SEGMENT_OVERRIDES[categoryTitle] ?? categoryTitle

  return buildCatalogUrl('catalog', 'Categories', `${categoryPathSegment}.jpg`)
}

export function getProductImageUrl(product) {
  if (!product?.name || !product?.category) return null
  const categoryPathSegment =
    CATEGORY_PATH_SEGMENT_OVERRIDES[product.category] ?? product.category

  return buildCatalogUrl('catalog', categoryPathSegment, `${product.name}.jpg`)
}

export function getResolvedProductImages(product, apiImages = []) {
  const providedImages = Array.isArray(apiImages) ? apiImages.filter((image) => image?.url) : []

  if (providedImages.length > 0) return providedImages

  const fallbackUrl = getProductImageUrl(product)
  if (!fallbackUrl) return []

  return [
    {
      id: `static-${toImageId(`${product.category}-${product.name}`)}`,
      url: fallbackUrl,
      alt: product.name,
    },
  ]
}
