from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from decimal import Decimal, ROUND_HALF_UP

@dataclass
class InvoiceItem:
    description: str
    quantity: int
    unit_price: float
    total: float = 0.0

    def calculate_total(self):
        # Use Decimal for monetary calculations
        qty = Decimal(str(self.quantity))
        price = Decimal(str(self.unit_price))
        res = (qty * price).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.total = float(res)
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
        sub = Decimal("0.00")
        for item in self.items:
            sub += Decimal(str(item.calculate_total()))
        
        self.subtotal = float(sub.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
        
        tax_r = Decimal(str(self.tax_rate))
        tax_amt = (sub * tax_r).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.tax_amount = float(tax_amt)
        
        total_val = (sub + tax_amt).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        self.total = float(total_val)
