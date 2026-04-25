import json

import app.models.anno_anno_links as m_aal
import app.models.anno_column_links as m_acl
import app.models.anno_group_links as m_agl

from app.utils import (
    fetchall,
    fetchone,
    get_items_diff,
    insert_dict,
    insert_dict_many,
    update_dict,
    update_dict_many,
    delete_id,
    delete_id_many
)

from pypika import Table, Tables, Query


def parse_column_entities(entities, entry_id):
    col_links = []
    
    for e in entities:
        # parse related column
        if e["type"] == "col":
            col_links.append({
                "anno_entry_id": entry_id,
                "column_id": e["data_id"],
                "value": e.get("value", None)
            })
    
    return col_links


def parse_anno_entities(entities, entry_id):
    anno_links = []
    
    for e in entities:
        # parse related annotation
        if e["type"] == "anno":
            anno_links.append({
                "anno_entry_id": entry_id,
                "annotation_id": e["data_id"]
            })
    
    return anno_links


def exists(cur, id: str):
    return get_anno_entry(cur, id) is not None


def get_anno_entry(cur, id: str):
    entries, clinks, alinks = Tables(
        "anno_entries",
        "anno_column_links",
        "anno_anno_links",
    )

    q = Query.from_(entries) \
        .join(clinks).on(clinks.anno_entry_id == entries.id) \
        .join(alinks).on(alinks.anno_entry_id == entries.id) \
        .where(entries.id == id) \
        .select("*")
    
    return fetchone(cur, q.get_sql())


def get_anno_entries(cur, annotation=None):
    entries, clinks, alinks = Tables(
        "anno_entries",
        "anno_column_links",
        "anno_anno_links",
    )

    q = Query.from_(entries) \
        .join(clinks).on(clinks.anno_entry_id == entries.id) \
        .join(alinks).on(alinks.anno_entry_id == entries.id) \
        .where(entries.id == id) \
        .select("*")
    
    if annotation is not None:
        q = q.where(entries.annotation_id == annotation)
        return fetchall(cur, q.get_sql())

    return fetchall(cur, Query.from_(entries).select("*").get_sql())


def add_anno_entry(cur, data: dict, return_field: str = "id"):
    if "text" not in data:
        data["text"] = None
    if "data" not in data:
        data["data"] = None
        
    value = insert_dict(
        cur,
        "anno_entries",
        ["id", "annotation_id", "type", "source", "text", "data"],
        data,
        return_field
    )

    if "entities" in data:
        add_anno_entry_entities(cur, data)

    return value


def add_anno_entries(cur, data: list[dict]):
    col_links = [], anno_links = []

    for d in data:
        if "text" not in d:
            d["text"] = None
        if "data" not in d:
            d["data"] = None

        if "entities" in d:
            eid = d["id"]
            
            col_links += parse_column_entities(d["entities"], eid)
            anno_links += parse_anno_entities(d["entities"], eid)

    insert_dict_many(
        cur,
        "anno_entries",
        ["id", "annotation_id", "type", "source", "text", "data"],
        data
    )

    if len(col_links) > 0:
        m_acl.add_anno_column_links(cur, col_links)

    if len(anno_links) > 0:
        m_aal.add_anno_anno_links(cur, anno_links)

    return cur


def add_anno_entry_entities(cur, data: dict):
    eid = data["id"]
        
    col_links = parse_column_entities(data["entities"], eid)
    anno_links = parse_anno_entities(data["entities"], eid)

    m_acl.add_anno_column_links(cur, col_links)
    m_aal.add_anno_anno_links(cur, anno_links)

    return cur


def update_anno_entry(cur, data: dict):
    if "text" not in data:
        data["text"] = None
    if "data" not in data:
        data["data"] = None

    update_dict(
        cur,
        "anno_entries",
        ["updated_at", "source", "text", "data"],
        data
    )

    if "entities" in data:
        update_anno_entry_entities(cur, data)

    return cur


def update_anno_entries(cur, data: list[dict]):
    for d in data:
        if "text" not in d:
            d["text"] = None
        if "data" not in d:
            d["data"] = None

    return update_dict_many(
        cur,
        "anno_entries",
        ["updated_at", "source", "text", "data"],
        data
    )


def update_anno_entry_entities(cur, data: dict):
    eid = data["id"]

    ex_columns = m_acl.get_anno_column_links(cur, eid)
    columns = parse_column_entities(data["entities"], eid)

    cols_to_add, cols_to_del = get_items_diff(ex_columns, columns, "column_id")

    m_acl.add_anno_column_links(cur, cols_to_add)
    m_acl.delete_anno_column_links(cur, cols_to_del)

    ex_annos = m_aal.get_anno_anno_links(cur, eid)
    annos = parse_anno_entities(data["entities"], eid)
    annos_to_add, annos_to_del = get_items_diff(ex_annos, annos, "annotation_id")

    m_aal.add_anno_anno_links(cur, annos_to_add)
    m_aal.delete_anno_anno_links(cur, annos_to_del)

    return cur


def delete_anno_entry(cur, id: str):
    return delete_id(cur, "anno_entries", id)


def delete_anno_entries(cur, ids: list[str]):
    return delete_id_many(cur, "anno_entries", ids)