import './CategoryPage.css'

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

const PRODUCTS = {
  1: [
    { id: 1,  name: 'Floral Wrap Dress',    price: 89.99 },
    { id: 2,  name: 'Linen Blazer',         price: 129.99 },
    { id: 3,  name: 'Ribbed Knit Top',      price: 44.99 },
    { id: 4,  name: 'Wide-Leg Trousers',    price: 74.99 },
    { id: 5,  name: 'Silk Cami Blouse',     price: 59.99 },
    { id: 6,  name: 'Tailored Mini Skirt',  price: 54.99 },
  ],
  2: [
    { id: 7,  name: 'Oxford Button-Down',   price: 64.99 },
    { id: 8,  name: 'Slim Chinos',          price: 69.99 },
    { id: 9,  name: 'Merino Crew Sweater',  price: 89.99 },
    { id: 10, name: 'Relaxed Linen Shirt',  price: 59.99 },
    { id: 11, name: 'Tapered Joggers',      price: 54.99 },
    { id: 12, name: 'Classic Polo',         price: 49.99 },
  ],
  3: [
    { id: 13, name: 'Double-Breasted Coat', price: 219.99 },
    { id: 14, name: 'Quilted Puffer Jacket',price: 159.99 },
    { id: 15, name: 'Trench Coat',          price: 189.99 },
    { id: 16, name: 'Leather Biker Jacket', price: 249.99 },
    { id: 17, name: 'Wool Duffle Coat',     price: 199.99 },
    { id: 18, name: 'Windbreaker',          price: 119.99 },
  ],
  4: [
    { id: 19, name: 'Leather Chelsea Boots',price: 149.99 },
    { id: 20, name: 'White Leather Sneakers',price: 99.99 },
    { id: 21, name: 'Block Heel Mules',     price: 89.99 },
    { id: 22, name: 'Running Trainers',     price: 119.99 },
    { id: 23, name: 'Strappy Sandals',      price: 69.99 },
    { id: 24, name: 'Suede Loafers',        price: 109.99 },
  ],
  5: [
    { id: 25, name: 'Leather Tote Bag',     price: 129.99 },
    { id: 26, name: 'Silk Scarf',           price: 49.99 },
    { id: 27, name: 'Structured Bucket Hat',price: 34.99 },
    { id: 28, name: 'Leather Belt',         price: 44.99 },
    { id: 29, name: 'Gold Hoop Earrings',   price: 29.99 },
    { id: 30, name: 'Sunglasses',           price: 59.99 },
  ],
  6: [
    { id: 31, name: 'High-Waist Leggings',  price: 64.99 },
    { id: 32, name: 'Sports Bra',           price: 39.99 },
    { id: 33, name: 'Zip-Up Hoodie',        price: 74.99 },
    { id: 34, name: 'Cycling Shorts',       price: 44.99 },
    { id: 35, name: 'Mesh Running Vest',    price: 34.99 },
    { id: 36, name: 'Sweat-Wicking Tee',    price: 29.99 },
  ],
  7: [
    { id: 37, name: 'Tailored Blazer',      price: 199.99 },
    { id: 38, name: 'Pleated Dress Trousers',price: 109.99 },
    { id: 39, name: 'Satin Evening Gown',   price: 289.99 },
    { id: 40, name: 'Classic Tuxedo Shirt', price: 89.99 },
    { id: 41, name: 'Pencil Skirt',         price: 79.99 },
    { id: 42, name: 'Tie & Pocket Square',  price: 39.99 },
  ],
  8: [
    { id: 43, name: 'Denim Dungarees',      price: 34.99 },
    { id: 44, name: 'Striped Onesie Set',   price: 24.99 },
    { id: 45, name: 'Puffer Vest',          price: 44.99 },
    { id: 46, name: 'Jersey Dress',         price: 29.99 },
    { id: 47, name: 'Canvas Trainers',      price: 34.99 },
    { id: 48, name: 'Knitted Cardigan',     price: 39.99 },
  ],
}

export default function CategoryPage({ category, onBack }) {
  const products = PRODUCTS[category.id] ?? []

  return (
    <div className="category-page">
      <header className="cat-header">
        <div className="cat-header-inner">
          <button className="back-btn" onClick={onBack}>
            <BackIcon /> Back
          </button>
          <span className="brand">MODÉ</span>
        </div>
      </header>

      <main className="cat-main">
        <div className="cat-hero">
          <p className="cat-eyebrow">Collection</p>
          <h1 className="cat-title">{category.title}</h1>
          <p className="cat-sub">{category.subtitle}</p>
        </div>

        <div className="product-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-placeholder">
                <span className="product-placeholder-label">{product.name[0]}</span>
              </div>
              <div className="product-info">
                <span className="product-name">{product.name}</span>
                <span className="product-price">${product.price.toFixed(2)}</span>
              </div>
              <div className="product-actions">
                <button className="add-cart-btn">
                  <CartIcon /> Add to Cart
                </button>
                <button className="add-wishlist-btn" aria-label="Add to wishlist">
                  <HeartIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
