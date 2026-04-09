# CS308 Course Project — Requirements

Sabanci University CS308 Software Engineering. Numbers below are the implicit requirement numbers referenced in the course document (e.g. "features 1, 3, 4, 5, 7 and 9" for the Progress Demo).

---

## Req 1 — Product Catalogue & Order Status (10%)
- Products are presented in categories
- Users select products and add them to a shopping cart to purchase
- Each product shows its current stock quantity
- When an order is placed, stock is decreased and the order is forwarded to the delivery department
- Order status is visible to the customer at three stages: **processing**, **in-transit**, **delivered**

## Req 2 — Guest Cart, Login-to-Order, Payment & Invoice (10%)
- Users can browse and add products to cart **without logging in**
- Login is required before placing an order and making a payment
- After payment is confirmed by the (mock-up) banking entity:
  - An invoice is shown on screen
  - A PDF copy of the invoice is emailed to the user

## Req 3 — Comments & Ratings (10%)
- Users can comment on and rate products (1–5 stars or 1–10 points)
- Comments must be **approved by the product manager** before they become visible

## Req 4 — UI Quality (5%)
- The application must have an attractive, easy-to-use, and professional-looking graphical user interface

## Req 5 — Search & Sorting (10%)
- Users can search products by name or description
- Products can be sorted by price or popularity
- Out-of-stock products remain searchable but **cannot be added to the cart**

## Req 6 — Admin Interface (10%)
- The website provides an admin interface for managerial tasks in addition to the customer-facing storefront

## Req 7 — Sales Manager Features (10%)
- Product properties at minimum: ID, name, model, serial number, description, quantity in stock, price, warranty status, distributor information
- **Sales managers** are responsible for:
  - Setting product prices
  - Setting a discount rate on selected items; the system automatically applies the new price and notifies users whose **wishlist** includes the discounted product
  - Viewing all invoices in a given date range; printing or saving them as PDF
  - Calculating revenue and profit/loss between given dates and viewing a chart

## Req 8 — Product Manager Features (10%)
- **Product managers** are responsible for:
  - Adding and removing products and product categories
  - Managing stock (all stock-related operations belong to this role)
  - Acting as the delivery department: viewing invoices, products to be delivered, and their delivery addresses
  - Delivery list fields: delivery ID, customer ID, product ID, quantity, total price, delivery address, and a completion flag
  - Marking deliveries as completed
  - Approving or disapproving product comments

## Req 9 — Customer Features (10%)
- **Customers** have the following properties at minimum: ID, name, tax ID, email address, home address, password
- Customers can:
  - View and search products
  - Comment on and rate products
  - Add products to their wishlist
  - Place new orders
  - Cancel existing orders
  - Return previously purchased products

## Req 10 — Credit Card Payment (3%)
- A customer enters credit card information to purchase a product
- Credit card verification and limit checks are **out of scope**

## Req 11 — Returns & Refunds (10%)
- A customer can return a purchased product within **30 days** of purchase
- The customer selects the item from order history
- The sales manager evaluates the refund request and, upon receiving the product back, authorises the refund
- The product is added back to stock
- The refund amount equals the **price paid at the time of purchase** (including any discount that was active at the time — not the current price)

## Req 12 — Security (1%)
- Registration and payment must be handled with security-aware, defensive programming
- Each user role has its own security privileges — they must not be mixed
- Sensitive data must be stored encrypted: user passwords, credit card information, invoices, user accounts

## Req 13 — Concurrency (1%)
- The system must handle multiple concurrent users of different roles simultaneously without loss of functionality or data integrity
