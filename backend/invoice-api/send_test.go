package main

import (
    "log"
    "project/backend/pkg/mailer"
    "github.com/joho/godotenv"
)

func main() {
    // 1. Load configuration from .env
    if err := godotenv.Load(); err != nil {
        log.Println("Note: .env file not found, using system environment variables")
    }

    // 2. Initialize the modular mailer
    mailClient := mailer.NewClient()

    // 3. FILL YOUR DATA HERE
    options := mailer.Options{
        To:      []string{"RECIPIENT_EMAIL_HERE"},
        Subject: "YOUR_SUBJECT_HERE",
        Body:    "<h1>YOUR_HTML_BODY_HERE</h1>",
        IsHTML:  true,
    }

    // 4. Run the code
    err := mailClient.Send(options)
    if err != nil {
        log.Fatalf("FAILED: %v", err)
    }

    log.Println("SUCCESS: Email sent to MailHog (http://localhost:8025)")
}