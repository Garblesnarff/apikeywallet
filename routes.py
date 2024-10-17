from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, current_app, g
from flask_login import login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError
from app import db, mail
from models import User, APIKey, Category, AuditLog
from forms import RegistrationForm, LoginForm, AddAPIKeyForm, AddCategoryForm
from utils import encrypt_key, decrypt_key, generate_confirmation_token, confirm_token, send_confirmation_email
import traceback
from datetime import datetime, timedelta
from itsdangerous import URLSafeTimedSerializer
from flask_mail import Message

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
        new_user.email_confirmed = False
        new_user.confirmation_token = generate_confirmation_token(email)
        db.session.add(new_user)
        db.session.commit()
        
        send_confirmation_email(new_user)
        
        flash('A confirmation email has been sent to your email address. Please check your inbox.', 'info')
        return redirect(url_for('auth.login'))
    
    return render_template('register.html', form=form)

@auth.route('/confirm/<token>')
def confirm_email(token):
    try:
        email = confirm_token(token)
    except:
        flash('The confirmation link is invalid or has expired.', 'danger')
        return redirect(url_for('main.index'))
    user = User.query.filter_by(email=email).first_or_404()
    if user.email_confirmed:
        flash('Account already confirmed. Please login.', 'success')
    else:
        user.email_confirmed = True
        user.confirmation_token = None
        db.session.add(user)
        db.session.commit()
        flash('You have confirmed your account. Thanks!', 'success')
    return redirect(url_for('auth.login'))

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
                if not user.email_confirmed:
                    flash('Please confirm your email before logging in.', 'warning')
                    return redirect(url_for('auth.login'))
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
    return redirect(url_for('main.index'))

@main.route('/')
def index():
    return render_template('landing.html')

@main.route('/wallet')
@login_required
def wallet():
    categories = Category.query.filter_by(user_id=current_user.id).order_by(Category.name).all()
    api_keys = APIKey.query.filter_by(user_id=current_user.id).order_by(APIKey.key_name).all()
    
    grouped_keys = {category.name: [] for category in categories}
    grouped_keys['Uncategorized'] = []
    
    for key in api_keys:
        key_data = {
            'id': key.id,
            'key_name': key.key_name,
            'category_id': key.category_id,
            'date_added': key.date_added,
            'expiration_date': key.expiration_date,
            'is_revoked': key.is_revoked,
            'is_active': key.is_active
        }
        if key.category:
            grouped_keys[key.category.name].append(key_data)
        else:
            grouped_keys['Uncategorized'].append(key_data)
    
    return render_template('wallet.html', grouped_keys=grouped_keys, all_categories=categories)

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
                category_id=form.category.data if form.category.data != 0 else None,
                expiration_date=form.expiration_date.data
            )
            db.session.add(new_key)
            
            # Add audit log
            audit_log = AuditLog(user_id=current_user.id, action="add", api_key_id=new_key.id)
            db.session.add(audit_log)
            
            db.session.commit()
            
            category = Category.query.get(new_key.category_id) if new_key.category_id else None
            return jsonify({
                'success': True,
                'message': 'API Key added successfully.',
                'key': {
                    'id': new_key.id,
                    'key_name': new_key.key_name,
                    'category_id': new_key.category_id,
                    'category_name': category.name if category else 'Uncategorized',
                    'expiration_date': new_key.expiration_date.isoformat() if new_key.expiration_date else None,
                    'is_revoked': new_key.is_revoked,
                    'is_active': new_key.is_active
                }
            }), 200
        except SQLAlchemyError as e:
            db.session.rollback()
            current_app.logger.error(f"Database error in add_key route: {str(e)}")
            return jsonify({'success': False, 'error': 'An error occurred while adding the API key. Please try again.'}), 500
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Unexpected error in add_key route: {str(e)}")
            return jsonify({'success': False, 'error': 'An unexpected error occurred. Please try again.'}), 500
    
    if request.method == 'GET':
        return render_template('add_key.html', form=form)
    
    return jsonify({'success': False, 'errors': form.errors}), 400

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
        
        # Add audit log
        audit_log = AuditLog(user_id=current_user.id, action="copy", api_key_id=key_id)
        db.session.add(audit_log)
        db.session.commit()
        
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
            # Add audit log before deleting the key
            audit_log = AuditLog(user_id=current_user.id, action="delete", api_key_id=key_id)
            db.session.add(audit_log)
            
            db.session.delete(api_key)
            db.session.commit()
            return jsonify({'success': True, 'message': 'API Key deleted successfully.'}), 200
        else:
            return jsonify({'success': False, 'error': 'API Key not found or unauthorized.'}), 404
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in delete_key route: {str(e)}')
        return jsonify({'success': False, 'error': 'An error occurred while deleting the API key.'}), 500

@main.route('/revoke_key/<int:key_id>', methods=['POST'])
@login_required
def revoke_key(key_id):
    try:
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if api_key:
            api_key.is_revoked = True
            
            # Add audit log
            audit_log = AuditLog(user_id=current_user.id, action="revoke", api_key_id=key_id)
            db.session.add(audit_log)
            
            db.session.commit()
            return jsonify({'success': True, 'message': 'API Key revoked successfully.'}), 200
        else:
            return jsonify({'success': False, 'error': 'API Key not found or unauthorized.'}), 404
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in revoke_key route: {str(e)}')
        return jsonify({'success': False, 'error': 'An error occurred while revoking the API key.'}), 500

@main.route('/update_key_expiration/<int:key_id>', methods=['POST'])
@login_required
def update_key_expiration(key_id):
    try:
        api_key = APIKey.query.filter_by(id=key_id, user_id=current_user.id).first()
        if api_key:
            expiration_date = request.json.get('expiration_date')
            if expiration_date:
                api_key.expiration_date = datetime.fromisoformat(expiration_date)
            else:
                api_key.expiration_date = None
            
            # Add audit log
            audit_log = AuditLog(user_id=current_user.id, action="update_expiration", api_key_id=key_id)
            db.session.add(audit_log)
            
            db.session.commit()
            return jsonify({
                'success': True, 
                'message': 'API Key expiration updated successfully.',
                'expiration_date': api_key.expiration_date.isoformat() if api_key.expiration_date else None,
                'is_active': api_key.is_active
            }), 200
        else:
            return jsonify({'success': False, 'error': 'API Key not found or unauthorized.'}), 404
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in update_key_expiration route: {str(e)}')
        return jsonify({'success': False, 'error': 'An error occurred while updating the API key expiration.'}), 500

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
            if category_id == 0:
                api_key.category_id = None
                category_name = 'Uncategorized'
            else:
                category = Category.query.get(category_id)
                if not category:
                    return jsonify({'success': False, 'error': 'Category not found.'}), 404
                api_key.category_id = category_id
                category_name = category.name
            db.session.commit()
            return jsonify({'success': True, 'message': 'Category updated successfully.', 'category_name': category_name}), 200
        return jsonify({'success': False, 'error': 'API Key not found or unauthorized.'}), 404
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in update_key_category route: {str(e)}')
        return jsonify({'success': False, 'error': 'An error occurred while updating the category.'}), 500

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
                return jsonify({'success': True, 'message': 'API Key name updated successfully.', 'new_name': new_name}), 200
            else:
                return jsonify({'success': False, 'error': 'New key name is required.'}), 400
        else:
            return jsonify({'success': False, 'error': 'API Key not found or unauthorized.'}), 404
    except SQLAlchemyError as e:
        db.session.rollback()
        current_app.logger.error(f'Database error in edit_key route: {str(e)}')
        return jsonify({'success': False, 'error': 'An error occurred while updating the API key name.'}), 500

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

@main.route('/get_categories_and_keys')
@login_required
def get_categories_and_keys():
    try:
        categories = Category.query.filter_by(user_id=current_user.id).order_by(Category.name).all()
        api_keys = APIKey.query.filter_by(user_id=current_user.id).order_by(APIKey.key_name).all()
        
        grouped_keys = {category.name: [] for category in categories}
        grouped_keys['Uncategorized'] = []
        
        for key in api_keys:
            if key.category:
                grouped_keys[key.category.name].append({
                    'id': key.id,
                    'key_name': key.key_name,
                    'category_id': key.category_id,
                    'date_added': key.date_added.isoformat()
                })
            else:
                grouped_keys['Uncategorized'].append({
                    'id': key.id,
                    'key_name': key.key_name,
                    'category_id': None,
                    'date_added': key.date_added.isoformat()
                })
        
        return jsonify({
            'categories': [{'id': c.id, 'name': c.name} for c in categories],
            'grouped_keys': grouped_keys
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_categories_and_keys route: {str(e)}")
        return jsonify({'error': 'An error occurred while fetching categories and keys.'}), 500

@main.route('/audit_log')
@login_required
def view_audit_log():
    audit_logs = AuditLog.query.filter_by(user_id=current_user.id).order_by(AuditLog.timestamp.desc()).all()
    return render_template('audit_log.html', audit_logs=audit_logs)