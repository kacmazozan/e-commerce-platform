from fastapi.testclient import TestClient
from unittest.mock import patch
from invoice_api.main import app

client = TestClient(app)

def test_health_check():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

@patch("invoice_api.main.process_invoice")
def test_generate_invoice_endpoint(mock_process):
    """Test that the invoice generation endpoint accepts valid data and starts background task."""
    test_payload = {
        "invoice_number": "TEST-001",
        "order_id": "ORD-123",
        "customer_name": "Test User",
        "customer_email": "test@example.com",
        "customer_address": "123 Test St, Test City",
        "items": [
            {
                "description": "Premium Service",
                "quantity": 1,
                "unit_price": 499.99
            }
        ]
    }
    
    response = client.post("/api/invoices/generate", json=test_payload)
    
    assert response.status_code == 200
    assert response.json()["message"] == "Invoice generation started"
    assert response.json()["invoice_number"] == "TEST-001"
    
    # Verify the background task was actually scheduled
    mock_process.assert_called_once()
    # Check if the data passed to background task is correct
    called_request = mock_process.call_args[0][0]
    assert called_request.invoice_number == "TEST-001"
    assert called_request.items[0].description == "Premium Service"

def test_invalid_email_validation():
    """Test that invalid email addresses are rejected by Pydantic validation."""
    invalid_payload = {
        "invoice_number": "INV-ERR",
        "order_id": "ORD-ERR",
        "customer_name": "Bad Email",
        "customer_email": "not-a-valid-email",
        "customer_address": "Nowhere",
        "items": []
    }
    
    response = client.post("/api/invoices/generate", json=invalid_payload)
    
    assert response.status_code == 422
    # Pydantic validation error should point to the email field
    detail = response.json()["detail"]
    assert any("customer_email" in str(err.get("loc", "")) for err in detail)
