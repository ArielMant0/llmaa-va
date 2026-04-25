import os

from pathlib import Path

from app.extensions import db

def init_db():
    filepath = Path(os.path.dirname(os.path.abspath(__file__)))
    schema_path = filepath.joinpath("..", "schemas", "schema.sql").resolve()

    with open(schema_path, "r") as file:
        schema = file.read()

        db.execute(schema)
        db.commit()

if __name__ == "__main__":
    init_db()