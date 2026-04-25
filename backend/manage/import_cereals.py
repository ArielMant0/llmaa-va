import os

from app.extensions import db
from app.utils import make_sql_params

from pandas import read_csv
from pathlib import Path
from pypika import Table, Query

column_list = [
    { "name": "name", "dtype": "string", "description": "cereal name" },
    { "name": "manufacturer", "dtype": "string", "description": "manufacturer name" },
    { "name": "type", "dtype": "string", "description": "whether it is eaten hot or cold" },
    { "name": "calories", "dtype": "integer", "description": "calories per serving" },
    { "name": "protein", "dtype": "integer", "description": "grams of protein" },
    { "name": "fat", "dtype": "integer", "description": "grams of fat" },
    { "name": "sodium", "dtype": "integer", "description": "miligrams of sodium" },
    { "name": "fiber", "dtype": "float", "description": "grams of dietary fiber" },
    { "name": "carbs", "dtype": "float", "description": "grams of complex carbohydrates" },
    { "name": "sugars", "dtype": "integer", "description": "grams of sugars" },
    { "name": "potassium", "dtype": "integer", "description": "miligrams of potassium" },
    { "name": "vitamins_minerals", "dtype": "integer", "description": "percentage of FDA recommended vitamins & minerals" },
    { "name": "display_shelf", "dtype": "string", "description": "display shelf for the cereal" },
    { "name": "weight", "dtype": "float", "description": "weight in ounces of one serving" },
    { "name": "cups", "dtype": "float", "description": "number of cups in one serving" },
    { "name": "rating", "dtype": "float", "description": "average customer rating from 0 to 100" },
    { "name": "x", "dtype": "float", "description": "t-SNE x coordinate" },
    { "name": "y", "dtype": "float", "description": "t-SNE y coordinate" },
]


def apply_type(value):
    return "hot" if value == "H" else "cold"


def apply_shelf(value):
    if value == 3:
        "top"
    elif value == 1:
        return "bottom"
    return "middle"


def apply_manufacturer(value):
    if value == "A":
        return "American Home Food Products"
    elif value == "G":
        return "General Mills"
    elif value == "K":
        return "Kellogs"
    elif value == "N":
        return "Nabisco"
    elif value == "P":
        return "Post"
    elif value == "Q":
        return "Quaker Oats"
    elif value == "R":
        return "Ralston Purina"
    return "Unknown"


def insert_columns(cur, dataset_id):
    cur.executemany(
        "INSERT INTO columns (dataset_id, name, dtype, description) VALUES (%s, %s, %s, %s);",
        [[dataset_id, c["name"], c["dtype"], c["description"]] for c in column_list]
    )
    print(f"inserted {len(column_list)} columns")


def insert_items(cur, dataset_id):
    filepath = Path(os.path.dirname(os.path.abspath(__file__)))
    data_path = filepath.joinpath("..", "data", "cereal.dr.csv").resolve()
    schema_path = filepath.joinpath("..", "schemas", "schema_cereals.sql").resolve()

    with open(schema_path, "r") as file:
        # create the table for this dataset
        db.execute(file.read())

    # read data from csv file
    df = read_csv(data_path)
    # rename "problematic" columns
    df.rename(columns={ "vitamins & minerals": "vitamins_minerals" }, inplace=True)

    # make some column values for meaningful
    df["manufacturer"] = df["manufacturer"].apply(apply_manufacturer)
    df["type"] = df["type"].apply(apply_type)
    df["display_shelf"] = df["display shelf"].apply(apply_shelf)

    # add dataset id as column
    df["dataset_id"] = dataset_id
    df["item_id"] = 0

    column_names = [c["name"] for c in column_list]
    all_columns = ["dataset_id", "item_id"] + column_names

    data_list = df.loc[:, all_columns].values.tolist()

    items = Table("items")
    q = Query.into(items).columns("dataset_id").insert(dataset_id)
    # create entries in items table
    for d in data_list:
        # get item id
        d[1] = cur.execute(q.get_sql() + " RETURNING id;").fetchone()["id"]

    # insert the items
    cur.executemany(
        f"INSERT INTO cereals (dataset_id, item_id, {','.join(column_names)}) " +
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
        .insert('cereals', 'cereals')

    ds_id = cur.execute(q.get_sql() + " RETURNING id").fetchone()["id"]
    print(f"inserted dataset {ds_id}")

    # insert all column meta data
    insert_columns(cur, ds_id)
    # insert items (in big table and single table)
    insert_items(cur, ds_id)

    db.commit()


if __name__ == "__main__":
    import_data()