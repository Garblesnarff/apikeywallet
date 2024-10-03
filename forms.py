from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, DateTimeField, BooleanField
from wtforms.validators import DataRequired, Email, EqualTo, Length, Optional
from datetime import datetime, timedelta

class RegistrationForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

class LoginForm(FlaskForm):
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

class AddAPIKeyForm(FlaskForm):
    key_name = StringField('Key Name', validators=[DataRequired(), Length(max=120)])
    api_key = StringField('API Key', validators=[DataRequired()])
    category = SelectField('Category', coerce=int, validators=[Optional()])
    expiration_date = DateTimeField('Expiration Date', format='%Y-%m-%dT%H:%M', validators=[Optional()], default=lambda: datetime.utcnow() + timedelta(days=30))
    submit = SubmitField('Add Key')

class EditAPIKeyForm(FlaskForm):
    key_name = StringField('Key Name', validators=[DataRequired(), Length(max=120)])
    category = SelectField('Category', coerce=int, validators=[Optional()])
    expiration_date = DateTimeField('Expiration Date', format='%Y-%m-%dT%H:%M', validators=[Optional()])
    is_revoked = BooleanField('Revoke Key')
    submit = SubmitField('Update Key')

class AddCategoryForm(FlaskForm):
    name = StringField('Category Name', validators=[DataRequired(), Length(max=50)])
    submit = SubmitField('Add Category')
