from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, APIKey
from forms import RegistrationForm, LoginForm, AddAPIKeyForm
from app import db, login_manager
from utils import encrypt_key, decrypt_key

main = Blueprint('main', __name__)
auth = Blueprint('auth', __name__)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@auth.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            flash('Email already exists.', 'danger')
            return redirect(url_for('auth.register'))
        new_user = User(email=form.email.data)
        new_user.set_password(form.password.data)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful. Please log in.', 'success')
        return redirect(url_for('auth.login'))
    return render_template('register.html', form=form)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user and user.check_password(form.password.data):
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
        new_key = APIKey(key_name=form.key_name.data, encrypted_key=encrypted_key, owner=current_user)
        db.session.add(new_key)
        db.session.commit()
        flash('API Key added successfully.', 'success')
        return redirect(url_for('main.wallet'))
    return render_template('add_key.html', form=form)

@main.route('/copy_key/<int:key_id>', methods=['POST'])
@login_required
def copy_key(key_id):
    api_key = APIKey.query.get_or_404(key_id)
    if api_key.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    decrypted_key = decrypt_key(api_key.encrypted_key)
    return jsonify({'key': decrypted_key})
