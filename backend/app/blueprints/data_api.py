from app.extensions import db

from flask import Blueprint, jsonify, request, Response

import app.models as models

ds_bp = Blueprint("data", __name__)

#########################################################################
## Get data
#########################################################################

@ds_bp.get("/datasets")
def get_datasets() -> Response:
    cur = db.cursor()
    return jsonify(models.m_ds.get_datasets(cur))


@ds_bp.get("/<int:dataset>/items")
def get_items(dataset) -> Response:
    cur = db.cursor()
    return jsonify(models.m_it.get_items(cur, dataset))


@ds_bp.get("/<int:dataset>/groups")
def get_groups(dataset) -> Response:
    cur = db.cursor()
    return jsonify(models.m_gr.get_groups(cur, dataset))


@ds_bp.get("/<int:dataset>/columns")
def get_columns(dataset) -> Response:
    cur = db.cursor()
    return jsonify(models.m_col.get_columns(cur, dataset))


@ds_bp.get("/<int:dataset>/annotations")
def get_annotations(dataset) -> Response:
    cur = db.cursor()
    return jsonify(models.m_anno.get_annotations(cur, dataset))


#########################################################################
## Create data
#########################################################################

@ds_bp.post("/create/annotation")
def create_annotation() -> Response:
    cur = db.cursor()

    try:
        aid = models.m_anno.create_from_json(cur, request.json)
        if aid is not None:
            db.commit()
    except Exception as e:
        print(str(e))
        return Response(str(e), status=500)

    return jsonify({ "id": aid })


@ds_bp.post("/create/annotation_entry")
def create_annotation_entry() -> Response:
    cur = db.cursor()

    try:
        eid = models.m_ae.create_from_json(cur, request.json)
        if eid is not None:
            db.commit()
    except Exception as e:
        print(str(e))
        return Response(str(e), status=500)

    return jsonify({ "id": eid })


@ds_bp.post("/create/group")
def create_group() -> Response:
    cur = db.cursor()

    try:
        gid = models.m_gr.create_from_json(cur, request.json)
        if gid is not None:
            db.commit()
    except Exception as e:
        print(str(e))
        return Response(str(e), status=500)

    return jsonify({ "id": gid })


#########################################################################
## Update data
#########################################################################

@ds_bp.post("/update/annotation")
def update_annotation() -> Response:
    cur = db.cursor()
    data = request.json

    try:
        aid = data.get("id", None)
        if aid is not None and models.m_anno.exists(cur, aid):
            models.m_anno.update_from_json(cur, data)
        else:
            aid = models.m_anno.create_from_json(cur, data)

        db.commit()
    except Exception as e:
        print(str(e))
        return Response(str(e), status=500)

    return jsonify({ "id": aid })


@ds_bp.post("/update/group")
def update_group() -> Response:
    cur = db.cursor()
    data = request.json

    try:
        # get group id
        gid = data.get("id", None)
        if gid is not None and models.m_gr.exists(cur, gid):
            models.m_gr.update_group_members(cur, gid, data["ids"])
        else:
            gid = models.m_gr.add_group(cur, data)
            # add members to groups
            models.m_gm.add_group_members(
                cur,
                [{ "group_id": gid, "item_id": d } for d in data["ids"]]
            )

        db.commit()
    except Exception as e:
        print(str(e))
        return Response("error", status=500)

    return jsonify({ "id": gid })


#########################################################################
## Delete data
#########################################################################

@ds_bp.post("/delete/annotation")
def delete_annotation() -> Response:
    cur = db.cursor()
    data = request.json
    try:
        # delete this annotation
        models.m_anno.delete_annotation(cur, data["id"])
        db.commit()
    except Exception as e:
        print(str(e))
        return Response("error", status=500)
    
    return Response("TODO", status=200)


@ds_bp.post("/delete/anno_entry")
def delete_anno_entry() -> Response:
    cur = db.cursor()
    data = request.json

    try:
        # delete this annotation entry
        models.m_ae.delete_anno_entry(cur, data["id"])
        db.commit()
    except Exception as e:
        print(str(e))
        return Response("error", status=500)

    return Response("TODO", status=200)


@ds_bp.post("/delete/anno_column_link")
def delete_anno_column_link() -> Response:
    cur = db.cursor()
    data = request.json
    try:
        # delete this entry column link
        models.m_acl.delete_anno_column_link(cur, data["id"])
        db.commit()
    except Exception as e:
        print(str(e))
        return Response("error", status=500)
    
    return Response("TODO", status=200)


@ds_bp.post("/delete/anno_anno_link")
def delete_anno_anno_link() -> Response:
    cur = db.cursor()
    data = request.json

    try:
        # delete this entry annotation link
        models.m_aal.delete_anno_anno_link(cur, data["id"])
        db.commit()
    except Exception as e:
        print(str(e))
        return Response("error", status=500)

    return Response("TODO", status=200)


@ds_bp.post("/delete/group")
def delete_group() -> Response:
    cur = db.cursor()
    data = request.json

    try:
        # delete this group
        models.m_gr.delete_group(cur, data["id"])
        db.commit()
    except Exception as e:
        print(str(e))
        return Response("error", status=500)

    return Response("TODO", status=200)


@ds_bp.post("/delete/anno_group_link")
def delete_anno_group_link() -> Response:
    cur = db.cursor()
    data = request.json

    try:
        # delete this group link
        models.m_agl.delete_anno_group_link(cur, data["id"])
        db.commit()
    except Exception as e:
        print(str(e))
        return Response("error", status=500)

    return Response("TODO", status=200)
    
