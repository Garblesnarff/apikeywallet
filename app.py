import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

def create_app():
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DATABASE_URL")
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

    # Google OAuth Configuration
    app.config['GOOGLE_OAUTH_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
    app.config['GOOGLE_OAUTH_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')

    # Initialize extensions
    db.init_app(app)
    
    with app.app_context():
        # Import and initialize extensions
        from extensions import login_manager
        login_manager.init_app(app)

        # Import models and create tables
        import models
        db.create_all()

        # Import and register blueprints
        from routes import main, auth
        app.register_blueprint(main)
        app.register_blueprint(auth, url_prefix='/auth')

        # Configure Google OAuth
        from flask_dance.contrib.google import make_google_blueprint
        google_bp = make_google_blueprint(
            client_id=os.environ.get("GOOGLE_CLIENT_ID"),
            client_secret=os.environ.get("GOOGLE_CLIENT_SECRET"),
            scope=["profile", "email"],
            redirect_url="/login/google/authorized",
            authorized_url="/login/google/authorized",
            reprompt_consent=True,
            redirect_to="auth.google_authorized"
        )
        app.register_blueprint(google_bp, url_prefix="/login")

    return app
