import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from urllib.parse import urlparse
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Initialize SQLAlchemy
db = SQLAlchemy()

# Create the app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Log database configuration
logging.debug(f"Database URL: {app.config['SQLALCHEMY_DATABASE_URI']}")

# Initialize SQLAlchemy with the app
db.init_app(app)

# Setup LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

# Import models
from models import User, APIKey, Category

# Create tables
with app.app_context():
    try:
        db.create_all()
        logging.info("All database tables created successfully")
        # Log table names
        table_names = db.engine.table_names()
        logging.debug(f"Created tables: {table_names}")
    except Exception as e:
        logging.error(f"Error creating database tables: {str(e)}")

# Import and register blueprints
from routes import main as main_blueprint
app.register_blueprint(main_blueprint)

from routes import auth as auth_blueprint
app.register_blueprint(auth_blueprint)

# Check API key table schema
with app.app_context():
    try:
        result = db.session.execute("SELECT * FROM api_key LIMIT 1")
        columns = result.keys()
        logging.info(f"API key table columns: {columns}")
    except Exception as e:
        logging.error(f"Error querying API key table: {str(e)}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
