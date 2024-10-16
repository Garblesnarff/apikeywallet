from app import app, db
from sqlalchemy import text
import os
import shutil

with app.app_context():
    # Drop the alembic_version table
    with db.engine.connect() as connection:
        connection.execute(text("DROP TABLE IF EXISTS alembic_version"))
        connection.commit()

    # Remove existing migrations folder
    if os.path.exists('migrations'):
        shutil.rmtree('migrations')

    print("Cleaned up existing migration data")
