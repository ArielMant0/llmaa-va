import app.models.group_members as m_gm
import app.models.anno_group_links as m_agl
from app.utils import (
    fetchall,
    fetchone,
    insert_dict,
    insert_dict_many,
    delete_id,
    delete_id_many
)

from pypika import Table, Query


def exists(cur, id: str):
    return get_group(cur, id) is not None


def get_dataset(cur, id: str):
    group = get_group(cur, id)
    return group["dataset_id"] if group is not None else None


def get_group(cur, id: str):
    groups = Table("groups")
    q = Query.from_(groups).select("*").where(groups.id == id)
    return fetchone(cur, q.get_sql())


def get_groups(cur, dataset=None):
    groups = Table("groups")
    if dataset is not None:
        q = Query.from_(groups).select("*").where(groups.dataset_id == dataset)
        return fetchall(cur, q.get_sql())

    return fetchall(cur, Query.from_(groups).select("*").get_sql())


def get_group_by_annotation(cur, annotation: str):
    groups = Table("groups")
    gid = m_agl.get_anno_group_link(cur, annotation)
    q = Query.from_(groups).select("*").where(groups.id == gid["id"])
    return fetchone(cur, q.get_sql())


def add_group(cur, data: dict, return_field: str = "id"):
    return insert_dict(
        cur,
        "groups",
        ["id", "type", "dataset_id"],
        data,
        return_field
    )


def add_groups(cur, data: list[dict]):
    return insert_dict_many(
        cur,
        "groups",
        ["id", "type", "dataset_id"],
        data
    )


def update_group_members(cur, id: str, members: list[int]):
    
    # get existing group members
    tmp = m_gm.get_group_members(cur, id)

    if tmp is not None and len(tmp) > 0:
        existing = set([member["id"] for member in tmp])
        current = set(members)

        to_del = list(existing.difference(current))
        if len(to_del) > 0:
            # delete old group members
            m_gm.delete_group_members(cur, to_del)

        to_add = list(current.difference(existing))
        if len(to_add) > 0:
            # add new group members
            m_gm.add_group_members(
                cur,
                [{ "group_id": id, "item_id": d } for d in to_add]
            )
    else:
        m_gm.add_group_members(
            cur,
            [{ "group_id": id, "item_id": d } for d in members]
        )

    return cur


def delete_group(cur, id: str):
    return delete_id(cur, "groups", id)


def delete_groups(cur, ids: list[str]):
    return delete_id_many(cur, "groups", ids)