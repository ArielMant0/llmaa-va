from app.utils import (
    fetchall,
    fetchone,
    insert_dict,
    insert_dict_many,
    delete_id,
    delete_id_many
)

from pypika import Table, Query, Criterion


def exists(cur, annotation: str, group: str):
    return get_anno_group_link(cur, annotation, group) is not None


def get_anno_group_link(cur, annotation: str, group: str):
    links = Table("anno_group_links")
    q = Query.from_(links) \
        .select("*") \
        .where(Criterion.all([
            links.annotation_id == annotation,
            links.group_id == group
        ]))
    return fetchone(cur, q.get_sql())


def get_anno_group_links(cur, annotation=None):
    links = Table("anno_group_links")
    if annotation is not None:
        q = Query.from_(links).select("*").where(links.annotation_id == annotation)
        return fetchall(cur, q.get_sql())

    return fetchall(cur, Query.from_(links).select("*").get_sql())


def add_anno_group_link(cur, data: dict, return_field: str = "id"):
    return insert_dict(
        cur,
        "anno_group_links",
        ["annotation_id", "group_id"],
        data,
        return_field
    )


def add_anno_group_links(cur, data: list[dict]):
    return insert_dict_many(
        cur,
        "anno_group_links",
        ["annotation_id", "group_id"],
        data
    )


def delete_anno_group_link(cur, id: int):
    return delete_id(cur, "anno_group_links", id)


def delete_anno_group_links(cur, ids: list[int]):
    return delete_id_many(cur, "anno_group_links", ids)