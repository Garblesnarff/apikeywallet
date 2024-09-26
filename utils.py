import os
from cryptography.fernet import Fernet

# Generate a key for encryption and decryption
# In a real-world scenario, this key should be securely stored and not hard-coded
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY', Fernet.generate_key())

fernet = Fernet(ENCRYPTION_KEY)

def encrypt_key(api_key):
    return fernet.encrypt(api_key.encode()).decode()

def decrypt_key(encrypted_key):
    return fernet.decrypt(encrypted_key.encode()).decode()
