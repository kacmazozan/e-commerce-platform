from dataclasses import dataclass, field
from datetime import datetime
from typing import List

@dataclass
class InvoiceItem:
    description: str
    quantity: int
    unit_price: float
    total: float = 0.0

    def calculate_total(self):
        self.total = self.quantity * self.unit_price
        return self.total

@dataclass
class InvoiceData:
    number: str
    order_id: str  # Added field for Order No
    customer_name: str
    customer_email: str
    customer_address: str  # Added field
    items: List[InvoiceItem]
    date: datetime = field(default_factory=datetime.now)
    subtotal: float = 0.0
    tax_rate: float = 0.20
    tax_amount: float = 0.0
    total: float = 0.0

    def calculate_totals(self):
        self.subtotal = sum(item.calculate_total() for item in self.items)
        self.tax_amount = self.subtotal * self.tax_rate
        self.total = self.subtotal + self.tax_amount
