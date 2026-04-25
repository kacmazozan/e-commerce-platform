import { describe, expect, it } from 'vitest'
import { getCategoryImageUrl, getProductImageUrl } from '../src/lib/catalogAssets'

describe('catalogAssets', () => {
  it('keeps ampersands literal in catalog image paths for Vite public assets', () => {
    expect(getProductImageUrl({ category: 'Formal', name: 'Tie & Pocket Square' })).toBe(
      '/catalog/Formal/Tie%20&%20Pocket%20Square.jpg'
    )
  })

  it('maps Kids & Baby category names to the public folder name', () => {
    expect(getCategoryImageUrl('Kids & Baby')).toBe('/catalog/Categories/Kids%20and%20Baby.jpg')
    expect(getProductImageUrl({ category: 'Kids & Baby', name: 'Canvas Trainers' })).toBe(
      '/catalog/Kids%20and%20Baby/Canvas%20Trainers.jpg'
    )
  })
})
