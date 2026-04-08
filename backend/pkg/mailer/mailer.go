package mailer

import (
	"fmt"
	"net/smtp"
	"os"
)

// Options defines the structure for sending an email
type Options struct {
	To      []string
	Subject string
	Body    string
	IsHTML  bool
}

// Client represents the SMTP mailer
type Client struct {
	addr string
	auth smtp.Auth
	from string
}

// NewClient initializes a new SMTP mailer client
func NewClient() *Client {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SENDER_EMAIL")

	addr := fmt.Sprintf("%s:%s", host, port)
	
	var auth smtp.Auth
	if user != "" {
		auth = smtp.PlainAuth("", user, pass, host)
	}

	return &Client{
		addr: addr,
		auth: auth,
		from: from,
	}
}

// Send dispatches an email using the provided options
func (c *Client) Send(opt Options) error {
	mime := "MIME-version: 1.0;\nContent-Type: text/plain; charset=\"UTF-8\";\n\n"
	if opt.IsHTML {
		mime = "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	}

	header := fmt.Sprintf("From: %s\nSubject: %s\n%s", c.from, opt.Subject, mime)
	msg := []byte(header + opt.Body)

	return smtp.SendMail(c.addr, c.auth, c.from, opt.To, msg)
}
