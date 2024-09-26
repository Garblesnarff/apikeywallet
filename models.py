from datetime import datetime

class User:
    def __init__(self, id, email, password_hash, date_joined=None):
        self.id = id
        self.email = email
        self.password_hash = password_hash
        self.date_joined = date_joined or datetime.utcnow()

class APIKey:
    def __init__(self, id, user_id, key_name, encrypted_key, date_added=None):
        self.id = id
        self.user_id = user_id
        self.key_name = key_name
        self.encrypted_key = encrypted_key
        self.date_added = date_added or datetime.utcnow()
