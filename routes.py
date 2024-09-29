from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify, g
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, APIKey, Category
from forms import RegistrationForm, LoginForm, AddAPIKeyForm, AddCategoryForm
from app import db
from utils import encrypt_key, decrypt_key
import logging
from sqlalchemy.exc import SQLAlchemyError

main = Blueprint('main', __name__)
auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        
        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email already exists.', 'danger')
            return redirect(url_for('auth.register'))
        
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
        
        try:
            user = User.query.filter_by(email=email).first()
            if user and user.check_password(password):
                login_user(user)
                return redirect(url_for('main.wallet'))
            else:
                flash('Invalid email or password.', 'danger')
        except SQLAlchemyError as e:
            logging.error(f"Database error: {str(e)}")
            flash('An error occurred while processing your request. Please try again later.', 'danger')
    
    return render_template('login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    try:
        logout_user()
        flash('You have been logged out successfully.', 'success')
    except SQLAlchemyError as e:
        logging.error(f"Database error during logout: {str(e)}")
        flash('An error occurred during logout. Please try again.', 'danger')
    except Exception as e:
        logging.error(f"Unexpected error during logout: {str(e)}")
        flash('An unexpected error occurred. Please try again.', 'danger')
    return redirect(url_for('auth.login'))

@main.route('/')
@login_required
def index():
    return redirect(url_for('main.wallet'))

@main.route('/wallet')
@login_required
def wallet():
    api_keys = current_user.api_keys.all()
    categories = current_user.categories.all()
    return render_template('wallet.html', api_keys=api_keys, categories=categories)

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
        logging.error(f'Error in copy_key route: {str(e)}')
        return jsonify({'error': 'An error occurred while processing the request'}), 500

@main.route('/delete_key/<int:key_id>', methods=['POST'])
@login_required
def delete_key(key_id):
    try:
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if api_key:
            db.session.delete(api_key)
            db.session.commit()
            return jsonify({'message': 'API Key deleted successfully.'}), 200
        else:
            return jsonify({'error': 'API Key not found or unauthorized.'}), 404
    except Exception as e:
        db.session.rollback()
        logging.error(f'Error in delete_key route: {str(e)}')
        return jsonify({'error': 'An error occurred while deleting the API key.'}), 500

@main.route('/add_category', methods=['GET', 'POST'])
@login_required
def add_category():
    form = AddCategoryForm()
    if form.validate_on_submit():
        new_category = Category(name=form.name.data, user_id=current_user.id)
        db.session.add(new_category)
        db.session.commit()
        flash('Category added successfully.', 'success')
        return redirect(url_for('main.wallet'))
    return render_template('add_category.html', form=form)

@main.route('/update_key_category/<int:key_id>', methods=['POST'])
@login_required
def update_key_category(key_id):
    category_id = request.json.get('category_id')
    api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
    if api_key:
        api_key.category_id = category_id
        db.session.commit()
        return jsonify({'message': 'Category updated successfully.'}), 200
    return jsonify({'error': 'API Key not found or unauthorized.'}), 404
