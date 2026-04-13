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
    
    # Force environmental variables for the script to use Gmail directly
    # Note: These credentials are for the whole project/group. 
    # The account owner is not responsible for group members' actions.
    os.environ['SMTP_HOST'] = 'smtp.gmail.com'
    os.environ['SMTP_PORT'] = '587'
    os.environ['SMTP_USER'] = 'invoice.fier@gmail.com'
    os.environ['SMTP_PASS'] = 'zyis qnxu djvz mdws'
    os.environ['SENDER_EMAIL'] = 'invoice.fier@gmail.com'
    
    mailer = MailerClient()

    # 3. MOCK PARAMETERS (Usually from your team member's API logic)
    items = [
        InvoiceItem("Nvidia RTX 5090", 1, 4000.00),
    ]
    
    mock_invoice = InvoiceData(
        number="INV-2026-5090",
        order_id="ORD-5090-PRANK", # Added Order No
        customer_name="Harun Yilmaz",
        customer_email="harun.yilmaz@sabanciuniv.edu",
        customer_address="Sabanci University Dorms, Istanbul", # Added address
        items=items,
        date=datetime.now()
    )

    # 4. Generate PDF
    print("Generating beautiful PDF...")
    pdf_content = generator.generate_pdf(mock_invoice)
    
    # 5. Send via Mail Server
    print(f"Sending via Gmail to {mock_invoice.customer_email}...")
    subject = f"FIER - Invoice for your order {mock_invoice.number}"
    body = f"""
    <h2>Hello {mock_invoice.customer_name}!</h2>
    <p>Thank you for your order with FIER. Please find your invoice attached below.</p>
    <p>Warm regards,<br>The FIER Team</p>
    """
    
    try:
        mailer.send(
            to=[mock_invoice.customer_email],
            subject=subject,
            body=body,
            is_html=True,
            attachments=[{
                "name": f"Invoice_{mock_invoice.number}.pdf",
                "content": pdf_content
            }]
        )
        print(f"Done! Check {mock_invoice.customer_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")

if __name__ == "__main__":
    main()
