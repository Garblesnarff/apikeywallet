from flask import current_app, render_template
from flask_mail import Message
from app import mail
from cryptography.fernet import Fernet
import os

def send_email(to, subject, template, **kwargs):
    msg = Message(subject, recipients=[to])
    msg.body = render_template(template + '.txt', **kwargs)
    msg.html = render_template(template + '.html', **kwargs)
    mail.send(msg)

def encrypt_key(api_key):
    f = Fernet(os.environ.get('ENCRYPTION_KEY').encode())
    return f.encrypt(api_key.encode()).decode()

def decrypt_key(encrypted_key):
    f = Fernet(os.environ.get('ENCRYPTION_KEY').encode())
    return f.decrypt(encrypted_key.encode()).decode()
