import os
from flask import Flask
from supabase import create_client, Client
from flask_login import LoginManager
from urllib.parse import urlparse

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment variables")

# Validate Supabase URL
parsed_url = urlparse(supabase_url)
if not all([parsed_url.scheme, parsed_url.netloc]):
    raise ValueError("Invalid SUPABASE_URL")

try:
    supabase: Client = create_client(supabase_url, supabase_key)
except Exception as e:
    print(f"Error initializing Supabase client: {str(e)}")
    raise

# Create the app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))

# Setup LoginManager
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'auth.login'

@login_manager.user_loader
def load_user(user_id):
    # Implement user loading logic here
    user_data = supabase.table('users').select('*').eq('id', user_id).execute()
    if user_data.data:
        from models import User
        return User(user_data.data[0]['id'], user_data.data[0]['email'], '')
    return None

# Import and register blueprints
from routes import main as main_blueprint
app.register_blueprint(main_blueprint)

from routes import auth as auth_blueprint
app.register_blueprint(auth_blueprint)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
