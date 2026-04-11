import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Add project root to path for imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from pkg.mailer.mailer import MailerClient
from pkg.invoice.models import InvoiceData, InvoiceItem
from pkg.invoice.generator import InvoiceGenerator

def main():
    # 1. Load config
    load_dotenv()
    
    # Update SMTP_HOST to localhost for local testing outside Docker
    # In Docker it would be 'mailserver'
    os.environ['SMTP_HOST'] = 'localhost' 
    
    # 2. Setup Generator and Mailer
    template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../pkg/invoice'))
    generator = InvoiceGenerator(template_dir)
    mailer = MailerClient()

    # 3. MOCK PARAMETERS (Usually from your team member's API logic)
    items = [
        InvoiceItem("Oversized Black Hoodie", 1, 85.00),
        InvoiceItem("Straight Fit Jeans", 2, 60.00),
        InvoiceItem("Silver Chain Necklace", 1, 25.00)
    ]
    
    mock_invoice = InvoiceData(
        number="INV-2026-001",
        order_id="ORD-984-ABC", # Added Order No
        customer_name="John Doe",
        customer_email="john@example.com",
        customer_address="123 Fashion Ave, London, UK", # Added address
        items=items,
        date=datetime.now()
    )

    # 4. Generate PDF
    print("Generating beautiful PDF...")
    pdf_content = generator.generate_pdf(mock_invoice)
    
    # 5. Send via Mail Server
    print("Sending via MailHog...")
    subject = f"FIER - Invoice for your order {mock_invoice.number}"
    body = f"""
    <h2>Hello {mock_invoice.name if hasattr(mock_invoice, 'name') else mock_invoice.customer_name}!</h2>
    <p>Thank you for your order with FIER. Please find your invoice attached below.</p>
    <p>Warm regards,<br>The FIER Team</p>
    """
    
    success = mailer.send(
        to=[mock_invoice.customer_email],
        subject=subject,
        body=body,
        is_html=True,
        attachments=[{
            "name": f"Invoice_{mock_invoice.number}.pdf",
            "content": pdf_content
        }]
    )

    if success:
        print("Done! Check your local mail at http://localhost:8025")
    else:
        print("Failed to send email.")

if __name__ == "__main__":
    main()
