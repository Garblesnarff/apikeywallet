from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, APIKey
from forms import RegistrationForm, LoginForm, AddAPIKeyForm
from app import db
from utils import encrypt_key, decrypt_key

main = Blueprint('main', __name__)
auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        
        # Check if user already exists
        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email already exists.', 'danger')
            return redirect(url_for('auth.register'))
        
        # Create new user
        new_user = User(email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        flash('Registration successful. Please log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('register.html', form=form)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        
        user = User.query.filter_by(email=email).first()
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('main.wallet'))
        else:
            flash('Invalid email or password.', 'danger')
    
    return render_template('login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

@main.route('/')
@login_required
def index():
    return redirect(url_for('main.wallet'))

@main.route('/wallet')
@login_required
def wallet():
    api_keys = current_user.api_keys.all()
    return render_template('wallet.html', api_keys=api_keys)

@main.route('/add_key', methods=['GET', 'POST'])
@login_required
def add_key():
    form = AddAPIKeyForm()
    if form.validate_on_submit():
        encrypted_key = encrypt_key(form.api_key.data)
        new_key = APIKey(
            user_id=current_user.id,
            key_name=form.key_name.data,
            encrypted_key=encrypted_key
        )
        db.session.add(new_key)
        db.session.commit()
        flash('API Key added successfully.', 'success')
        return redirect(url_for('main.wallet'))
    return render_template('add_key.html', form=form)

@main.route('/copy_key/<int:key_id>', methods=['POST'])
@login_required
def copy_key(key_id):
    try:
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if not api_key:
            return jsonify({'error': 'API key not found or unauthorized'}), 403
        decrypted_key = decrypt_key(api_key.encrypted_key)
        return jsonify({'key': decrypted_key})
    except Exception as e:
        print(f'Error in copy_key route: {str(e)}')
        return jsonify({'error': 'An error occurred while processing the request'}), 500

@main.route('/delete_key/<int:key_id>', methods=['POST'])
@login_required
def delete_key(key_id):
    api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
    if api_key:
        db.session.delete(api_key)
        db.session.commit()
        flash('API Key deleted successfully.', 'success')
    else:
        flash('API Key not found or unauthorized.', 'danger')
    return redirect(url_for('main.wallet'))
