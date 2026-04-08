package main

import (
	"log"
	"project/backend/pkg/mailer"

	"github.com/joho/godotenv"
)

func main() {
	// Load the .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found")
	}

	// Initialize the modular mailer client
	mailClient := mailer.NewClient()

	// Example: Sending a welcome email
	err := mailClient.Send(mailer.Options{
		To:      []string{"test-user@example.com"},
		Subject: "Welcome to our E-Commerce Platform!",
		Body:    "<h1>Hello!</h1><p>Your account is ready.</p>",
		IsHTML:  true,
	})

	if err != nil {
		log.Fatalf("Failed to send email: %v", err)
	}

	log.Println("Test email successfully sent to MailHog!")
}
