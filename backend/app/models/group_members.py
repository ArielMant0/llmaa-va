from app.utils import (
    fetchall,
    insert_dict,
    insert_dict_many,
    update_dict,
    update_dict_many,
    delete_id,
    delete_id_many
)

from pypika import Table, Query


def get_group_members(cur, group=None):
    gm = Table("group_members")
    if group is not None:
        q = Query.from_(gm).select("*").where(gm.group_id == group)
        return fetchall(cur, q.get_sql())

    return fetchall(cur, Query.from_(gm).select("*").get_sql())


def add_group_member(cur, data: dict, return_field: str = "id"):
    return insert_dict(
        cur,
        "group_members",
        ["group_id", "item_id"],
        data,
        return_field
    )


def add_group_members(cur, data: list[dict]):
    return insert_dict_many(
        cur,
        "group_members",
        ["group_id", "item_id"],
        data
    )

def update_group_member(cur, data: dict):
    return update_dict(cur, "group_members", ["group_id", "item_id"], data)


def update_group_members(cur, data: list[dict]):
    return update_dict_many(cur, "group_members", ["group_id", "item_id"], data)


def delete_group_member(cur, id: int):
    return delete_id(cur, "group_members", id)


def delete_group_members(cur, ids: list[int]):
    return delete_id_many(cur, "group_members", ids)