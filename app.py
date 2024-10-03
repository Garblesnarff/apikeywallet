import os
from flask import Flask, g
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from urllib.parse import urlparse
from flask_migrate import Migrate
import logging
from flask_mail import Mail

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize SQLAlchemy
db = SQLAlchemy()

# Initialize Flask-Mail
mail = Mail()

# Create the app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True  # Enable SQLAlchemy echo mode for debugging

# Email configuration
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER')

# Log the database URL (make sure to remove any sensitive information)
parsed_url = urlparse(app.config['SQLALCHEMY_DATABASE_URI'])
logger.info(f"Database URL: {parsed_url.scheme}://{parsed_url.hostname}:{parsed_url.port}{parsed_url.path}")

# Initialize SQLAlchemy with the app
db.init_app(app)

# Initialize Flask-Mail with the app
mail.init_app(app)

# Initialize Flask-Migrate
migrate = Migrate(app, db)

# Setup LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'

@login_manager.user_loader
def load_user(user_id):
    from models import User
    return User.query.get(int(user_id))

def get_db_session():
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'], pool_pre_ping=True, pool_recycle=3600)
    db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))
    return db_session

@app.before_request
def before_request():
    g.db = get_db_session()

@app.teardown_appcontext
def shutdown_session(exception=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Import models
from models import User, APIKey, Category

# Create tables
with app.app_context():
    try:
        db.create_all()
        logger.info("Database tables created successfully")
    except SQLAlchemyError as e:
        logger.error(f"Error creating database tables: {str(e)}")

# Import and register blueprints
from routes import main as main_blueprint
app.register_blueprint(main_blueprint)

from routes import auth as auth_blueprint
app.register_blueprint(auth_blueprint)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
