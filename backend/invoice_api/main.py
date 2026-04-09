import os
import sys
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr

# Add project root to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pkg.mailer.mailer import MailerClient
from pkg.invoice.models import InvoiceData, InvoiceItem
from pkg.invoice.generator import InvoiceGenerator

app = FastAPI(title="FIER Invoice API")

# Initialize global clients
# In Docker, SMTP_HOST will be 'mailserver' (from docker-compose)
SMTP_HOST = os.getenv("SMTP_HOST", "mailserver")
TEMPLATE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../pkg/invoice'))

class ItemRequest(BaseModel):
    description: str
    quantity: int
    unit_price: float

class InvoiceRequest(BaseModel):
    invoice_number: str
    order_id: str
    customer_name: str
    customer_email: EmailStr
    customer_address: str
    items: List[ItemRequest]

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
        # Ensure host is correct for current environment
        os.environ['SMTP_HOST'] = SMTP_HOST 
        
        subject = f"FIER - Invoice for your order {invoice_data.number}"
        body = f"""
        <h2>Hello {invoice_data.customer_name}!</h2>
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
