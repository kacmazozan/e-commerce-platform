import sys
import os

# Ensure `backend/` is on the path so `pkg.*` and `invoice_api.*` resolve
# regardless of where pytest is invoked from.
sys.path.insert(0, os.path.dirname(__file__))
