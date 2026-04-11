import pdfkit
from jinja2 import Environment, FileSystemLoader, select_autoescape

class InvoiceGenerator:
    def __init__(self, template_dir):
        self.template_dir = template_dir
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(["html"]),
        )

    def generate_pdf(self, invoice_data) -> bytes:
        template = self.jinja_env.get_template("template.html")
        
        # Calculate totals
        invoice_data.calculate_totals()
        
        # Render HTML
        html_content = template.render(
            number=invoice_data.number,
            order_id=invoice_data.order_id, # Added Order ID
            date_str=invoice_data.date.strftime('%B %d, %Y'),
            customer_name=invoice_data.customer_name,
            customer_email=invoice_data.customer_email,
            customer_address=invoice_data.customer_address,  # Added this line
            items=invoice_data.items,
            subtotal=invoice_data.subtotal,
            tax_rate=invoice_data.tax_rate,
            tax_amount=invoice_data.tax_amount,
            total=invoice_data.total
        )
        
        # wkhtmltopdf options for a modern, borderless look
        options = {
            'page-size': 'A4',
            'margin-top': '0',
            'margin-right': '0',
            'margin-bottom': '0',
            'margin-left': '0',
            'encoding': "UTF-8",
            'no-outline': None,
            'quiet': ''
        }
        
        return pdfkit.from_string(html_content, False, options=options)
