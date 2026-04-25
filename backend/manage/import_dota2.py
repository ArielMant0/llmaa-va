import os

from app.extensions import db
from app.utils import make_sql_params

from pandas import read_csv
from pathlib import Path
from pypika import Table, Query

column_list = [
    { "name": "name", "dtype": "string", "description": "hero name" },
    { "name": "primary_attribute", "dtype": "string", "description": "the hero's primary attribute" },
    { "name": "attack_type", "dtype": "string", "description": "whether the hero is melee or ranged" },
    { "name": "base_health", "dtype": "integer", "description": "hero's health points at level 0" },
    { "name": "base_health_regen", "dtype": "float", "description": "hero's health regen per second at level 0" },
    { "name": "base_mana", "dtype": "integer", "description": "hero's mana points at level 0" },
    { "name": "base_mana_regen", "dtype": "float", "description": "hero's mana regen per second at level 0" },
    { "name": "base_armor", "dtype": "integer", "description": "hero's armor points at level 0" },
    { "name": "base_magic_resist", "dtype": "integer", "description": "hero's magic resistance points at level 0" },
    { "name": "base_attack_min", "dtype": "integer", "description": "hero's minimum attack damage at level 0" },
    { "name": "base_attack_max", "dtype": "integer", "description": "hero's maximum attack damage at level 0" },
    { "name": "base_str", "dtype": "integer", "description": "hero's strength points at level 0" },
    { "name": "base_agi", "dtype": "integer", "description": "hero's agility points at level 0" },
    { "name": "base_int", "dtype": "integer", "description": "hero's intelligence points at level 0" },
    { "name": "str_gain", "dtype": "float", "description": "hero's strength gain per level" },
    { "name": "agi_gain", "dtype": "float", "description": "hero's agility gain per level" },
    { "name": "int_gain", "dtype": "float", "description": "hero's intelligence gain per level" },
    { "name": "attack_range", "dtype": "integer", "description": "hero's attack range" },
    { "name": "projectile_speed", "dtype": "integer", "description": "hero's projectile speed (if ranged)" },
    { "name": "attack_rate", "dtype": "float", "description": "hero's attack" },
    { "name": "base_attack_time", "dtype": "float", "description": "hero's attack time at level 0" },
    { "name": "move_speed", "dtype": "integer", "description": "hero's movement speed" },
    { "name": "legs", "dtype": "integer", "description": "the number of legs the hero has" },
    { "name": "day_vision", "dtype": "integer", "description": "how much vision the hero has at daytime" },
    { "name": "night_vision", "dtype": "integer", "description": "how much vision the hero has at nighttime" },
    { "name": "pro_pick", "dtype": "integer", "description": "how often this hero was picked in professional games" },
    { "name": "pro_win", "dtype": "integer", "description": "how often this hero has won in professional games" },
    { "name": "pro_ban", "dtype": "integer", "description": "how often this hero was banned in professional games" },
    { "name": "pub_pick", "dtype": "integer", "description": "how often this hero was picked in professional games" },
    { "name": "pub_win", "dtype": "integer", "description": "how often this hero has won in professional games" },

    { "name": "x", "dtype": "float", "description": "t-SNE x coordinate" },
    { "name": "y", "dtype": "float", "description": "t-SNE y coordinate" },
]


def insert_columns(cur, dataset_id):
    cur.executemany(
        "INSERT INTO columns (dataset_id, name, dtype, description) VALUES (%s, %s, %s, %s);",
        [[dataset_id, c["name"], c["dtype"], c["description"]] for c in column_list]
    )
    print(f"inserted {len(column_list)} columns")


def insert_items(cur, dataset_id):
    filepath = Path(os.path.dirname(os.path.abspath(__file__)))
    data_path = filepath.joinpath("..", "data", "dota2-heros.dr.csv").resolve()
    schema_path = filepath.joinpath("..", "schemas", "schema_dota2.sql").resolve()

    with open(schema_path, "r") as file:
        # create the table for this dataset
        db.execute(file.read())

    # read data from csv file
    df = read_csv(data_path)



    # add dataset id as column
    df["dataset_id"] = dataset_id
    df["item_id"] = 0

    column_names = [c["name"] for c in column_list]
    all_columns = ["dataset_id", "item_id"] + column_names

    df.fillna(0, inplace=True)
    data_list = df.loc[:, all_columns].values.tolist()

    items = Table("items")
    q = Query.into(items).columns("dataset_id").insert(dataset_id)
    # create entries in items table
    for d in data_list:
        # get item id
        d[1] = cur.execute(q.get_sql() + " RETURNING id;").fetchone()["id"]

    # insert the items
    cur.executemany(
        f"INSERT INTO dota2 (dataset_id, item_id, {','.join(column_names)}) " +
        f"VALUES (%s, %s, {make_sql_params(column_names)})",
        data_list
    )

    print(f"inserted {len(data_list)} data points")


def import_data():
    cur = db.cursor()

    # create dataset
    datasets = Table("datasets")
    q = Query.into(datasets) \
        .columns("name", "table_name") \
        .insert('dota2', 'dota2')

    ds_id = cur.execute(q.get_sql() + " RETURNING id").fetchone()["id"]
    print(f"inserted dataset {ds_id}")

    # insert all column meta data
    insert_columns(cur, ds_id)
    # insert items (in big table and single table)
    insert_items(cur, ds_id)

    db.commit()


if __name__ == "__main__":
    import_data()