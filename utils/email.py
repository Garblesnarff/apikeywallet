from flask import current_app, render_template, url_for
from flask_mail import Message
from extensions import mail

def send_verification_email(user):
    token = user.generate_verification_token()
    msg = Message('Verify Your KeyGuardian Account',
                 sender=current_app.config['MAIL_DEFAULT_SENDER'],
                 recipients=[user.email])
    
    verification_url = url_for('auth.verify_email', token=token, _external=True)
    msg.body = f'''Please click the following link to verify your email address:
{verification_url}

If you did not create an account, please ignore this email.

Best regards,
The KeyGuardian Team
'''
    msg.html = render_template('email/verify_email.html',
                             verification_url=verification_url)
    
    mail.send(msg)
