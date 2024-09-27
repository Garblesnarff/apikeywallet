import os
from cryptography.fernet import Fernet

ENCRYPTION_KEY = os.environ['ENCRYPTION_KEY']
if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY environment variable is not set")

fernet = Fernet(ENCRYPTION_KEY)

def encrypt_key(api_key):
    return fernet.encrypt(api_key.encode()).decode()

def decrypt_key(encrypted_key):
    if isinstance(encrypted_key, str):
        encrypted_key = encrypted_key.encode()
    return fernet.decrypt(encrypted_key).decode()
