from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, APIKey, Category
from forms import RegistrationForm, LoginForm, AddAPIKeyForm, AddCategoryForm
from app import db
from utils import encrypt_key, decrypt_key
import logging
from sqlalchemy.exc import SQLAlchemyError
from functools import wraps
import time

main = Blueprint('main', __name__)
auth = Blueprint('auth', __name__)

def retry_db_operation(max_retries=3, delay=1):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return f(*args, **kwargs)
                except SQLAlchemyError as e:
                    logging.error(f"Database error (attempt {attempt + 1}/{max_retries}): {str(e)}")
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay)
        return wrapper
    return decorator

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
                logging.info(f"User {email} logged in successfully")
                next_page = request.args.get('next')
                return redirect(next_page or url_for('main.wallet'))
            else:
                logging.warning(f"Failed login attempt for user {email}")
                flash('Invalid email or password.', 'danger')
        except Exception as e:
            logging.error(f"Error during login process: {str(e)}")
            flash('An error occurred during login. Please try again.', 'danger')
    
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
@retry_db_operation()
def wallet():
    try:
        api_keys = current_user.api_keys.all()
        categories = current_user.categories.all()
        logging.info(f"Successfully loaded wallet for user {current_user.id}")
        return render_template('wallet.html', api_keys=api_keys, categories=categories)
    except Exception as e:
        logging.error(f"Error in wallet route for user {current_user.id}: {str(e)}")
        flash('An error occurred while loading your wallet. Please try again later.', 'danger')
        return redirect(url_for('main.index'))

@main.route('/add_key', methods=['GET', 'POST'])
@login_required
def add_key():
    form = AddAPIKeyForm()
    form.category.choices = [(0, 'Uncategorized')] + [(c.id, c.name) for c in current_user.categories]
    
    if form.validate_on_submit():
        encrypted_key = encrypt_key(form.api_key.data)
        new_key = APIKey(
            user_id=current_user.id,
            key_name=form.key_name.data,
            encrypted_key=encrypted_key,
            category_id=form.category.data if form.category.data != 0 else None
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

@main.route('/add_category', methods=['POST'])
@login_required
def add_category():
    try:
        category_name = request.json.get('name')
        if not category_name:
            return jsonify({'error': 'Category name is required.'}), 400
        
        new_category = Category(name=category_name, user_id=current_user.id)
        db.session.add(new_category)
        db.session.commit()
        
        return jsonify({'message': 'Category added successfully.', 'id': new_category.id, 'name': new_category.name}), 201
    except Exception as e:
        db.session.rollback()
        logging.error(f'Error in add_category route: {str(e)}')
        return jsonify({'error': 'An error occurred while adding the category.'}), 500

@main.route('/view_category/<int:category_id>')
@login_required
def view_category(category_id):
    category = Category.query.filter_by(id=category_id, user_id=current_user.id).first_or_404()
    api_keys = category.api_keys.all()
    categories = current_user.categories.all()
    return render_template('wallet.html', api_keys=api_keys, categories=categories, current_category=category)
