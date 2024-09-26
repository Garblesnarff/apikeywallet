from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, APIKey
from forms import RegistrationForm, LoginForm, AddAPIKeyForm
from app import supabase
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
        user = supabase.table('users').select('*').eq('email', email).execute()
        if user.data:
            flash('Email already exists.', 'danger')
            return redirect(url_for('auth.register'))
        
        # Create new user
        new_user = supabase.auth.sign_up({
            'email': email,
            'password': password
        })
        
        if new_user.user:
            flash('Registration successful. Please log in.', 'success')
            return redirect(url_for('auth.login'))
        else:
            flash('Registration failed. Please try again.', 'danger')
    
    return render_template('register.html', form=form)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        
        # Authenticate user
        user = supabase.auth.sign_in_with_password({'email': email, 'password': password})
        
        if user.user:
            login_user(User(user.user.id, email, ''))  # We don't store the password hash
            return redirect(url_for('main.wallet'))
        else:
            flash('Invalid email or password.', 'danger')
    
    return render_template('login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    supabase.auth.sign_out()
    logout_user()
    return redirect(url_for('auth.login'))

@main.route('/')
@login_required
def index():
    return redirect(url_for('main.wallet'))

@main.route('/wallet')
@login_required
def wallet():
    api_keys = supabase.table('api_keys').select('*').eq('user_id', current_user.id).execute()
    return render_template('wallet.html', api_keys=api_keys.data)

@main.route('/add_key', methods=['GET', 'POST'])
@login_required
def add_key():
    form = AddAPIKeyForm()
    if form.validate_on_submit():
        encrypted_key = encrypt_key(form.api_key.data)
        new_key = {
            'user_id': current_user.id,
            'key_name': form.key_name.data,
            'encrypted_key': encrypted_key
        }
        supabase.table('api_keys').insert(new_key).execute()
        flash('API Key added successfully.', 'success')
        return redirect(url_for('main.wallet'))
    return render_template('add_key.html', form=form)

@main.route('/copy_key/<int:key_id>', methods=['POST'])
@login_required
def copy_key(key_id):
    api_key = supabase.table('api_keys').select('*').eq('id', key_id).eq('user_id', current_user.id).execute()
    if not api_key.data:
        return jsonify({'error': 'Unauthorized'}), 403
    decrypted_key = decrypt_key(api_key.data[0]['encrypted_key'])
    return jsonify({'key': decrypted_key})
