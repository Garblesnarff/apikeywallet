from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify, g, current_app
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, APIKey, Category
from forms import RegistrationForm, LoginForm, AddAPIKeyForm, AddCategoryForm
from app import db
from utils import encrypt_key, decrypt_key, send_email
import logging
import traceback
from sqlalchemy.exc import SQLAlchemyError
import os

main = Blueprint('main', __name__)
auth = Blueprint('auth', __name__)

@auth.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.wallet'))
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
        
        token = new_user.generate_confirmation_token()
        send_email(new_user.email, 'Confirm Your Account',
                   'email/confirm', user=new_user, token=token)
        flash('A confirmation email has been sent to you by email.', 'info')
        return redirect(url_for('auth.login'))
    
    return render_template('register.html', form=form)

@auth.route('/confirm/<token>')
@login_required
def confirm(token):
    if current_user.email_confirmed:
        return redirect(url_for('main.wallet'))
    if current_user.confirm(token):
        db.session.commit()
        flash('You have confirmed your account. Thanks!', 'success')
    else:
        flash('The confirmation link is invalid or has expired.', 'danger')
    return redirect(url_for('main.wallet'))

@auth.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.wallet'))
    
    form = LoginForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        
        try:
            user = User.query.filter_by(email=email).first()
            if user and user.check_password(password):
                if user.email_confirmed:
                    login_user(user)
                    return redirect(url_for('main.wallet'))
                else:
                    flash('Please confirm your email before logging in.', 'warning')
            else:
                flash('Invalid email or password.', 'danger')
        except SQLAlchemyError as e:
            current_app.logger.error(f"Database error during login: {str(e)}")
            flash('An error occurred while processing your request. Please try again later.', 'danger')
        except Exception as e:
            current_app.logger.error(f"Unexpected error during login: {str(e)}")
            flash('An unexpected error occurred. Please try again later.', 'danger')
    
    return render_template('login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    try:
        logout_user()
        flash('You have been logged out successfully.', 'success')
    except SQLAlchemyError as e:
        current_app.logger.error(f"Database error during logout: {str(e)}")
        flash('An error occurred during logout. Please try again.', 'danger')
    except Exception as e:
        current_app.logger.error(f"Unexpected error during logout: {str(e)}")
        flash('An unexpected error occurred. Please try again.', 'danger')
    return redirect(url_for('auth.login'))

@main.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.wallet'))
    return render_template('index.html')

@main.route('/wallet')
@login_required
def wallet():
    try:
        current_app.logger.info(f"Fetching API keys for user {current_user.id}")
        api_keys = APIKey.query.filter_by(user_id=current_user.id).all()
        current_app.logger.info(f"Fetched {len(api_keys)} API keys")
        
        current_app.logger.info(f"Fetching categories for user {current_user.id}")
        categories = Category.query.filter_by(user_id=current_user.id).all()
        current_app.logger.info(f"Fetched {len(categories)} categories")
        
        grouped_keys = {category.name: [] for category in categories}
        grouped_keys['Uncategorized'] = []
        
        for key in api_keys:
            if key.category:
                grouped_keys[key.category.name].append(key)
            else:
                grouped_keys['Uncategorized'].append(key)
        
        for category, keys in grouped_keys.items():
            current_app.logger.info(f"Category '{category}' has {len(keys)} keys")
        
        return render_template('wallet.html', grouped_keys=grouped_keys, categories=categories, debug=current_app.debug)
    except Exception as e:
        current_app.logger.error(f"Error in wallet route: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        flash('An error occurred while retrieving your wallet. Please try again later.', 'danger')
        return redirect(url_for('main.index'))

@main.route('/add_key', methods=['GET', 'POST'])
@login_required
def add_key():
    form = AddAPIKeyForm()
    categories = Category.query.filter_by(user_id=current_user.id).all()
    form.category.choices = [(0, 'Uncategorized')] + [(c.id, c.name) for c in categories]
    
    if form.validate_on_submit():
        try:
            current_app.logger.debug(f"Form data: key_name={form.key_name.data}, category={form.category.data}")
            
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
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error in add_key route: {str(e)}")
            current_app.logger.error(f"Error type: {type(e).__name__}")
            current_app.logger.error(f"Error details: {e.args}")
            current_app.logger.error(f"Traceback: {traceback.format_exc()}")
            flash('An error occurred while adding the API key. Please try again.', 'danger')
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error in add_key route: {str(e)}")
            current_app.logger.error(f"Error type: {type(e).__name__}")
            current_app.logger.error(f"Error details: {e.args}")
            current_app.logger.error(f"Traceback: {traceback.format_exc()}")
            flash('An unexpected error occurred. Please try again.', 'danger')

    return render_template('add_key.html', form=form)

@main.route('/copy_key/<int:key_id>', methods=['POST'])
@login_required
def copy_key(key_id):
    try:
        current_app.logger.info(f"Copy key request received for key_id: {key_id}")
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if not api_key:
            current_app.logger.warning(f"API key not found or unauthorized for key_id: {key_id}")
            return jsonify({'error': 'API key not found or unauthorized'}), 403
        current_app.logger.info(f"API key found for key_id: {key_id}")
        decrypted_key = decrypt_key(api_key.encrypted_key)
        current_app.logger.info(f"API key successfully decrypted for key_id: {key_id}")
        return jsonify({'key': decrypted_key})
    except Exception as e:
        current_app.logger.error(f'Error in copy_key route: {str(e)}')
        current_app.logger.error(traceback.format_exc())
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
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in delete_key route: {str(e)}')
        return jsonify({'error': 'An error occurred while deleting the API key.'}), 500

@main.route('/add_category', methods=['GET', 'POST'])
@login_required
def add_category():
    form = AddCategoryForm()
    if form.validate_on_submit():
        try:
            new_category = Category(name=form.name.data, user_id=current_user.id)
            db.session.add(new_category)
            db.session.commit()
            flash('Category added successfully.', 'success')
            return redirect(url_for('main.wallet'))
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f'Database error in add_category route: {str(e)}')
            flash('An error occurred while adding the category. Please try again later.', 'danger')
    return render_template('add_category.html', form=form)

@main.route('/update_key_category/<int:key_id>', methods=['POST'])
@login_required
def update_key_category(key_id):
    try:
        category_id = request.json.get('category_id')
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if api_key:
            api_key.category_id = category_id if category_id != 0 else None
            db.session.commit()
            return jsonify({'message': 'Category updated successfully.'}), 200
        return jsonify({'error': 'API Key not found or unauthorized.'}), 404
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in update_key_category route: {str(e)}')
        return jsonify({'error': 'An error occurred while updating the category.'}), 500

@main.route('/manage_categories')
@login_required
def manage_categories():
    categories = Category.query.filter_by(user_id=current_user.id).all()
    return render_template('manage_categories.html', categories=categories)

@main.route('/edit_category/<int:category_id>', methods=['GET', 'POST'])
@login_required
def edit_category(category_id):
    category = Category.query.filter_by(id=category_id, user_id=current_user.id).first_or_404()
    form = AddCategoryForm(obj=category)
    if form.validate_on_submit():
        try:
            category.name = form.name.data
            db.session.commit()
            flash('Category updated successfully.', 'success')
            return redirect(url_for('main.manage_categories'))
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f'Database error in edit_category route: {str(e)}')
            flash('An error occurred while updating the category. Please try again later.', 'danger')
    return render_template('edit_category.html', form=form, category=category)

@main.route('/delete_category/<int:category_id>', methods=['POST'])
@login_required
def delete_category(category_id):
    try:
        category = Category.query.filter_by(id=category_id, user_id=current_user.id).first_or_404()
        db.session.delete(category)
        db.session.commit()
        flash('Category deleted successfully.', 'success')
        return redirect(url_for('main.manage_categories'))
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in delete_category route: {str(e)}')
        flash('An error occurred while deleting the category. Please try again later.', 'danger')
        return redirect(url_for('main.manage_categories'))

@main.route('/edit_key/<int:key_id>', methods=['POST'])
@login_required
def edit_key(key_id):
    try:
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if api_key:
            new_name = request.json.get('key_name')
            if new_name:
                api_key.key_name = new_name
                db.session.commit()
                return jsonify({'message': 'API Key name updated successfully.'}), 200
            else:
                return jsonify({'error': 'New key name is required.'}), 400
        else:
            return jsonify({'error': 'API Key not found or unauthorized.'}), 404
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in edit_key route: {str(e)}')
        return jsonify({'error': 'An error occurred while updating the API key name.'}), 500

@main.route('/get_key/<int:key_id>', methods=['POST'])
@login_required
def get_key(key_id):
    try:
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if api_key:
            decrypted_key = decrypt_key(api_key.encrypted_key)
            return jsonify({'key': decrypted_key}), 200
        else:
            return jsonify({'error': 'API Key not found or unauthorized.'}), 404
    except Exception as e:
        current_app.logger.error(f'Error in get_key route: {str(e)}')
        return jsonify({'error': 'An error occurred while retrieving the API key.'}), 500