from cryptography.fernet import Fernet
import os
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

def get_encryption_key():
    key = os.environ.get('ENCRYPTION_KEY')
    if not key:
        raise ValueError("ENCRYPTION_KEY environment variable is not set")
    
    # Generate a key using PBKDF2
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b'keyguardian',  # Fixed salt for consistent key derivation
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(key.encode()))
    return key

def encrypt_key(api_key):
    """
    Encrypt an API key using Fernet symmetric encryption
    """
    if not api_key:
        raise ValueError("API key cannot be empty")
    
    f = Fernet(get_encryption_key())
    encrypted_key = f.encrypt(api_key.encode())
    return encrypted_key.decode()

def decrypt_key(encrypted_key):
    """
    Decrypt an encrypted API key
    """
    if not encrypted_key:
        raise ValueError("Encrypted key cannot be empty")
    
    f = Fernet(get_encryption_key())
    decrypted_key = f.decrypt(encrypted_key.encode())
    return decrypted_key.decode()
