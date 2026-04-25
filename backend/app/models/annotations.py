import app.models.groups as m_gr
import app.models.group_members as m_gm
import app.models.anno_group_links as m_agl
import app.models.anno_entries as m_ae

from app.utils import (
    fetchall,
    fetchone,
    insert_dict,
    insert_dict_many,
    delete_id,
    delete_id_many,
    update_dict,
    update_dict_many
)

from pypika import Table, Tables, Query

def create_from_json(cur, data: dict):
    aid = data["id"]
    group = data.get("group", None)

    if not exists(cur, aid):
        add_annotation(cur, data, "id")


        if group is not None:
            
            gid = group["id"]
            group["dataset_id"] = data["dataset_id"]

            if not m_gr.exists(cur, gid):
                m_gr.add_group(cur, group)
                m_gm.add_group_members(
                    cur,
                    [{ "group_id": gid, "item_id": d } for d in group["ids"]]
                )

            group_links = [{ "annotation_id": aid, "group_id": gid }]

            # link this group to the annotation
            m_agl.add_anno_group_links(cur, group_links)

        # go through all entries
        for entry in data["entries"]:

            entry["annotation_id"] = aid
            m_ae.add_anno_entry(cur, entry)

        return True
    
    return False


def update_from_json(cur, data: dict):
    aid = data["id"]
    group = data.get("group", None)

    print()
    print("update anno from json")
    print(data)
    print()

    if exists(cur, aid):

        if group is not None:
            
            gid = group["id"]
            group["dataset_id"] = data["dataset_id"]

            if not m_gr.exists(cur, gid):
                m_gr.add_group(cur, group)
                m_gm.add_group_members(
                    cur,
                    [{ "group_id": gid, "item_id": d } for d in group["ids"]]
                )
            else:
                # update group members
                m_gr.update_group_members(cur, gid, group["ids"])

            # link this group to the annotation
            if not m_agl.exists(cur, aid, gid):
                m_agl.add_anno_group_links(cur, [{ "annotation_id": aid, "group_id": gid }])

        # go through all entries
        for entry in data["entries"]:

            eid = entry["id"]
            entry["annotation_id"] = aid

            if m_ae.exists(cur, eid):
                # update entry and its associated entities (columns, annotations)
                m_ae.update_anno_entry(cur, entry)
            else:
                # add entry and its associated entities (columns, annotations)
                m_ae.add_anno_entry(cur, entry)

        return True
    
    return False


def exists(cur, id: int):
    annos = Table("annotations")
    return Query.from_(annos).select("id").where(annos.id == id) is not None


def get_annotation(cur, id):
    annos, entries, glinks, clinks, alinks = Tables(
        "annotations",
        "anno_entries",
        "anno_group_links",
        "anno_column_links",
        "anno_anno_links",
    )

    q = Query.from_(annos) \
        .join(glinks).on(glinks.annotation_id == annos.id) \
        .join(entries).on(entries.annotation_id == annos.id) \
        .join(clinks).on(clinks.anno_entry_id == entries.id) \
        .join(alinks).on(alinks.anno_entry_id == entries.id) \
        .select("*")

    q = q.where(annos.id == id)

    return fetchone(cur, q.get_sql())


def get_annotations(cur, dataset=None):
    annos, entries, glinks, clinks, alinks = Tables(
        "annotations",
        "anno_entries",
        "anno_group_links",
        "anno_column_links",
        "anno_anno_links",
    )

    q = Query.from_(annos) \
        .join(glinks).on(glinks.annotation_id == annos.id) \
        .join(entries).on(entries.annotation_id == annos.id) \
        .join(clinks).on(clinks.anno_entry_id == entries.id) \
        .join(alinks).on(alinks.anno_entry_id == entries.id) \
        .select("*")

    if dataset is not None:
        q = q.where(annos.dataset_id == dataset)

    return fetchall(cur, q.get_sql())


def add_annotation(cur, data: dict, return_field: str = "id"):
    return insert_dict(
        cur,
        "annotations",
        ["id", "dataset_id", "author", "title"],
        data,
        return_field
    )


def add_annotations(cur, data: list[dict]):
    return insert_dict_many(
        cur,
        "annotations",
        ["id", "dataset_id", "author", "title"],
        data,
    )

def delete_annotation(cur, id: str):
    return delete_id(cur, "annotations", id)


def delete_annotations(cur, ids: list[str]):
    return delete_id_many(cur, "annotations", ids)


def update_annotation(cur, data: dict):
    return update_dict(cur, "annotations", ["author", "title"], data)


def update_annotations(cur, data: list[dict]):
    return update_dict_many(cur, "annotations", ["author", "title"], data)