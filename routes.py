from flask import Blueprint, render_template, redirect, url_for, request, flash, jsonify, g, current_app
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import User, APIKey, Category
from forms import RegistrationForm, LoginForm, AddAPIKeyForm, AddCategoryForm
from app import db
from utils import encrypt_key, decrypt_key
import logging
import traceback
from sqlalchemy.exc import SQLAlchemyError
import os

main = Blueprint('main', __name__)
auth = Blueprint('auth', __name__)

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
        
        # Add debug logging for grouped_keys
        current_app.logger.debug(f"grouped_keys content: {grouped_keys}")
        
        return render_template('wallet.html', grouped_keys=grouped_keys, categories=categories, debug=current_app.debug)
    except Exception as e:
        current_app.logger.error(f"Error in wallet route: {str(e)}")
        current_app.logger.error(traceback.format_exc())
        flash('An error occurred while retrieving your wallet. Please try again later.', 'danger')
        return redirect(url_for('main.index'))

# Add other routes here...

@main.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.wallet'))
    return render_template('index.html')

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
        
        flash('Registration successful. Please log in.', 'success')
        return redirect(url_for('auth.login'))
    
    return render_template('register.html', form=form)

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
                login_user(user)
                return redirect(url_for('main.wallet'))
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

# Add other routes as needed...
