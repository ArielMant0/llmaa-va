from app.utils import (
    fetchall,
    insert_dict,
    insert_dict_many,
    delete_id,
    delete_id_many
)

from pypika import Table, Query


def get_anno_column_links(cur, anno_entry=None):
    links = Table("anno_column_links")
    if anno_entry is not None:
        q = Query.from_(links).select("*").where(links.anno_entry_id == anno_entry)
        return fetchall(cur, q.get_sql())

    return fetchall(cur, Query.from_(links).select("*").get_sql())


def add_anno_column_link(cur, data: dict, return_field: str = "id"):
    return insert_dict(
        cur,
        "anno_column_links",
        ["anno_entry_id", "column_id"],
        data,
        return_field
    )


def add_anno_column_links(cur, data: list[dict]):
    return insert_dict_many(
        cur,
        "anno_column_links",
        ["anno_entry_id", "column_id"],
        data
    )


def delete_anno_column_link(cur, id: int):
    return delete_id(cur, "anno_column_links", id)


def delete_anno_column_links(cur, ids: list[int]):
    return delete_id_many(cur, "anno_column_links", ids)