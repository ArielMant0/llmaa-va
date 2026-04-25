from app.utils import (
    fetchall,
    insert_dict,
    insert_dict_many
)

from pypika import Table, Query


def get_columns(cur, dataset=None):
    columns = Table("columns")
    if dataset is not None:
        q = Query.from_(columns).select("*").where(columns.dataset_id == dataset)
        return fetchall(cur, q.get_sql())

    return fetchall(cur, Query.from_(columns).select("*").get_sql())


def add_column(cur, data: dict, return_field: str = "id"):
    return insert_dict(
        cur,
        "columns",
        ["dataset_id", "name", "dtype", "description"],
        data,
        return_field
    )


def add_columns(cur, data: list[dict]):
    return insert_dict_many(
        cur,
        "columns",
        ["dataset_id", "name", "dtype", "description"],
        data
    )