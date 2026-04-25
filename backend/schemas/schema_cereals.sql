CREATE TABLE IF NOT EXISTS cereals (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    manufacturer VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    calories INTEGER  NOT NULL,
    protein INTEGER NOT NULL,
    fat INTEGER NOT NULL,
    sodium INTEGER NOT NULL,
    fiber FLOAT NOT NULL,
    carbs FLOAT NOT NULL,
    sugars INTEGER NOT NULL,
    potassium INTEGER NOT NULL,
    vitamins_minerals INTEGER NOT NULL,
    display_shelf VARCHAR(50) NOT NULL,
    weight FLOAT NOT NULL,
    cups FLOAT NOT NULL,
    rating FLOAT NOT NULL,

    x FLOAT NOT NULL,       -- dimred x coordinate
    y FLOAT NOT NULL,       -- dimred y coordinate
    FOREIGN KEY (dataset_id) REFERENCES datasets(id),
    FOREIGN KEY (item_id) REFERENCES items(id)
);
