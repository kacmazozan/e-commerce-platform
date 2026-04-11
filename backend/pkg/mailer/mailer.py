import os
import smtplib
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

class MailerClient:
    def __init__(self):
        self.host = os.getenv("SMTP_HOST", "localhost")
        self.port = int(os.getenv("SMTP_PORT", 1025))
        self.user = os.getenv("SMTP_USER", "")
        self.password = os.getenv("SMTP_PASS", "")
        self.sender = os.getenv("SENDER_EMAIL", "invoices@fier.com")
        self.timeout = int(os.getenv("SMTP_TIMEOUT", 10))

    def send(
        self,
        to: List[str],
        subject: str,
        body: str,
        is_html: bool = False,
        attachments: Optional[List[dict]] = None
    ):
        """
        Sends an email. Attachments should be a list of dicts: 
        {"name": "filename.pdf", "content": b"bytes"}
        """
        msg = MIMEMultipart()
        msg["From"] = self.sender
        msg["To"] = ", ".join(to)
        msg["Subject"] = subject

        # Attach body
        msg.attach(MIMEText(body, "html" if is_html else "plain", "utf-8"))

        # Attach files
        if attachments:
            for att in attachments:
                part = MIMEApplication(att["content"], _subtype="pdf")
                part.add_header("Content-Disposition", "attachment", filename=att["name"])
                msg.attach(part)

        # Send — raises on failure
        with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as server:
            if self.user:
                server.login(self.user, self.password)
            server.sendmail(self.sender, to, msg.as_string())
