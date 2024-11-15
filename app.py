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
        from routes import main, auth_bp
        app.register_blueprint(main)
        app.register_blueprint(auth_bp, url_prefix='/auth')

    return app
