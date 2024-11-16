"""
Utils package for KeyGuardian application.
Contains email utilities and other helper functions.
"""

from .crypto import encrypt_key, decrypt_key

__all__ = ['encrypt_key', 'decrypt_key']
