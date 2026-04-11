import os
import re
import sys
import html
from typing import List
from datetime import datetime

from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel, EmailStr, Field, field_validator

try:
    from pkg.mailer.mailer import MailerClient
    from pkg.invoice.models import InvoiceData, InvoiceItem
    from pkg.invoice.generator import InvoiceGenerator
except ModuleNotFoundError as e:
    if "pkg" not in (e.name or ""):
        raise
    # Fallback for local development if PYTHONPATH is not set
    sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
    from pkg.mailer.mailer import MailerClient
    from pkg.invoice.models import InvoiceData, InvoiceItem
    from pkg.invoice.generator import InvoiceGenerator

app = FastAPI(title="FIER Invoice API")

TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../pkg/invoice'))

class ItemRequest(BaseModel):
    description: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)

class InvoiceRequest(BaseModel):
    invoice_number: str
    order_id: str
    customer_name: str
    customer_email: EmailStr
    customer_address: str
    items: List[ItemRequest]

    @field_validator("invoice_number")
    @classmethod
    def validate_invoice_number(cls, v: str) -> str:
        if not re.match(r'^[A-Za-z0-9._\-]+$', v):
            raise ValueError("invoice_number may only contain letters, digits, dots, hyphens, and underscores")
        return v

def process_invoice(request: InvoiceRequest):
    """
    Background task to generate PDF and send email
    """
    try:
        # 1. Prepare data
        invoice_items = [
            InvoiceItem(i.description, i.quantity, i.unit_price) 
            for i in request.items
        ]
        
        invoice_data = InvoiceData(
            number=request.invoice_number,
            order_id=request.order_id,
            customer_name=request.customer_name,
            customer_email=request.customer_email,
            customer_address=request.customer_address,
            items=invoice_items,
            date=datetime.now()
        )

        # 2. Generate PDF
        generator = InvoiceGenerator(TEMPLATE_DIR)
        pdf_content = generator.generate_pdf(invoice_data)

        # 3. Send Email
        mailer = MailerClient()
        subject = f"FIER - Invoice for your order {invoice_data.number}"
        
        safe_name = html.escape(invoice_data.customer_name)
        body = f"""
        <h2>Hello {safe_name}!</h2>
        <p>Thank you for your order with FIER. Please find your invoice attached below.</p>
        <p>Warm regards,<br>The FIER Team</p>
        """
        
        mailer.send(
            to=[invoice_data.customer_email],
            subject=subject,
            body=body,
            is_html=True,
            attachments=[{
                "name": f"Invoice_{invoice_data.number}.pdf",
                "content": pdf_content
            }]
        )
        print(f"Successfully processed invoice {request.invoice_number}")

    except Exception as e:
        print(f"Error processing invoice {request.invoice_number}: {e}")

@app.post("/api/invoices/generate")
async def generate_invoice(request: InvoiceRequest, background_tasks: BackgroundTasks):
    # We use BackgroundTasks to respond immediately to the caller
    # while the PDF generation and mailing happens asynchronously
    background_tasks.add_task(process_invoice, request)
    return {"message": "Invoice generation started", "invoice_number": request.invoice_number}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
