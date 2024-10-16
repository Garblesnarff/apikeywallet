from app import app
from routes import main_blueprint, auth_blueprint

app.register_blueprint(main_blueprint)
app.register_blueprint(auth_blueprint)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
