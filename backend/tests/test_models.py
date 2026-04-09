import pytest
from datetime import datetime
from pkg.invoice.models import InvoiceItem, InvoiceData

def test_invoice_item_calculation():
    """Test that a single invoice item calculates its total correctly."""
    item = InvoiceItem(description="Test Item", quantity=2, unit_price=50.0)
    total = item.calculate_total()
    
    assert total == 100.0
    assert item.total == 100.0

def test_invoice_data_totals():
    """Test that the entire invoice calculates subtotal, tax, and total correctly."""
    item1 = InvoiceItem(description="Item 1", quantity=1, unit_price=100.0)
    item2 = InvoiceItem(description="Item 2", quantity=2, unit_price=50.0)
    
    invoice = InvoiceData(
        number="INV-001",
        order_id="ORD-001",
        customer_name="Test Customer",
        customer_email="test@example.com",
        customer_address="123 Test St",
        items=[item1, item2],
        tax_rate=0.20 # 20%
    )
    
    invoice.calculate_totals()
    
    # item1: 1 * 100 = 100
    # item2: 2 * 50 = 100
    # subtotal = 200
    assert invoice.subtotal == 200.0
    
    # tax = 200 * 0.20 = 40
    assert invoice.tax_amount == 40.0
    
    # total = 200 + 40 = 240
    assert invoice.total == 240.0

def test_empty_invoice_totals():
    """Test calculations with no items."""
    invoice = InvoiceData(
        number="INV-EMPTY",
        order_id="ORD-EMPTY",
        customer_name="None",
        customer_email="none@example.com",
        customer_address="None",
        items=[]
    )
    invoice.calculate_totals()
    
    assert invoice.subtotal == 0.0
    assert invoice.tax_amount == 0.0
    assert invoice.total == 0.0
