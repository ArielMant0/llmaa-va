from app.models.datasets import get_dataset_item_table
from app.models.groups import get_dataset as get_dataset_from_group
from app.models.group_members import get_group_members
from app.utils import (
    fetchall,
    fetchone,
    insert_dict,
    insert_dict_many
)

from pypika import Table, Query


def get_dataset(cur, id):
    items = Table("items")
    result = fetchone(
        cur,
        Query.from_(items).select("dataset_id").where(items.id == id).get_sql()
    )
    return None if result is None else result["dataset_id"]


def get_items(cur, dataset):
    table_name = get_dataset_item_table(cur, dataset)
    return fetchall(
        cur,
        Query.from_(table_name).select("*").get_sql()
    )


def get_items_by_group(cur, group_id):
    dataset_id = get_dataset_from_group(cur, group_id)
    table_name = get_dataset_item_table(cur, dataset_id)
    ids = [m["item_id"] for m in get_group_members(cur, group_id)]
    items = Table(table_name)
    return fetchall(
        cur,
        Query.from_(items).select("*").where(items.id.isin(ids)).get_sql()
    )


def get_items_by_id(cur, ids):
    dataset = get_dataset(cur, ids[0])
    table_name = get_dataset_item_table(cur, dataset)
    items = Table(table_name)
    return fetchall(
        cur,
        Query.from_(items).select("*").where(items.id.isin(ids)).get_sql()
    )


def add_item(cur, dataset: int, data: dict, return_field: str = "id"):
    table_name = get_dataset_item_table(cur, dataset)
    return insert_dict(
        cur,
        table_name,
        list(data.keys()),
        data,
        return_field
    )


def add_items(cur, dataset: int, data: list[dict]):
    table_name = get_dataset_item_table(cur, dataset)
    return insert_dict_many(
        cur,
        table_name,
        list(data[0].keys()),
        data
    )