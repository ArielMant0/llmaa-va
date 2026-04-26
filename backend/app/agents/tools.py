from app.extensions import db_ro
from app.models import m_col, m_it, m_gr, m_anno, m_ae
from app.utils import fetchall, fetchone

from langchain.tools import tool
from pandas import DataFrame
from pypika import Table, Query, Criterion


@tool
def get_schema() -> list[dict]:
    """Return the database schema."""
    
    results = fetchall(
        db_ro.cursor(),
        "SELECT table_name, column_name, data_type FROM information_schema.columns " + 
        "WHERE table_schema = 'public' ORDER BY table_name;"
    )

    tables = {}
    for r in results:
        tn = r["table_name"]
        cn = r["column_name"]
        dt = r["data_type"]

        if tn in tables:
            tables[tn].append({ "column_name": cn, "data_type": dt })
        else:
            tables[tn] = [{ "column_name": cn, "data_type": dt }]

    return [{ "table_name": k, "columns": v } for k, v in tables.items()]
    

@tool
def get_dataset_summary(dataset_id: int) -> dict:
    """Return summary statistics and metadata for the given dataset."""
    cur = db_ro.cursor()
    ds_table = Table("datasets")
    q = Query.from_(ds_table).select("*").where(ds_table.id == dataset_id)
    ds = fetchone(cur, q.get_sql())

    items = m_it.get_items(cur, dataset_id)
    columns = m_col.get_columns(cur, dataset_id)

    return {
        "name": ds["name"],
        "num_rows": len(items),
        "columns": columns
    }


def calc_stats(df: DataFrame, columns: list[dict]) -> list[dict]:
    result = []
    for c in columns:
        
        name = c["name"]
        # ignore name and id columns
        if name == "id" or name == "name":
            continue

        obj = {
            "id": c["id"],
            "name": name,
            "type": c["dtype"],
            "description": c["description"]
        }

        # if this is a categorical column
        if c["dtype"] == "string":
            val_counts = df[name].value_counts()
            obj["value_counts"] = val_counts.to_dict()
        else:
            stats = df[name].describe()
            obj.update(stats.to_dict())
            del obj["count"]

        result.append(obj)

    return result


@tool  
def get_desc_stats(dataset_id: int) -> list[dict]:
    """
    Return descriptive statistics for all columns for the complete dataset.
    For numerical columns, this will return the following data:
        - id: the column's id
        - name: the column's name
        - type: the column's data type
        - description: the column's description
        - min: minimum value
        - max: maximum value
        - mean: mean value
        - std: standard deviation
        - median: median value
        - 25%: 25%-percentile
        - 50%: 50%-percentile
        - 75%: 75%-percentile
    For categorical columns, this will return the following data:
        - id: the column's id
        - name: the column's name
        - type: the column's data type
        - description: the column's description
        - value_counts: counts for all unique values
    """
    cur = db_ro.cursor()
    df = DataFrame(m_it.get_items(db_ro.cursor(), dataset_id))
    columns = m_col.get_columns(cur, dataset_id)
    return calc_stats(df, columns)


@tool  
def get_desc_stats_group(group_id: int) -> list[dict]:
    """
    Return descriptive statistics for all columns for the given group.
    For numerical columns, this will return the following data:
        - id: the column's id
        - name: the column's name
        - type: the column's data type
        - description: the column's description
        - min: minimum value
        - max: maximum value
        - mean: mean value
        - std: standard deviation
        - median: median value
        - 25%: 25%-percentile
        - 50%: 50%-percentile
        - 75%: 75%-percentile
    For categorical columns, this will return the following data:
        - id: the column's id
        - name: the column's name
        - type: the column's data type
        - description: the column's description
        - value_counts: counts for all unique values
    """
    cur = db_ro.cursor()
    df = DataFrame(m_it.get_items_by_group(cur, group_id))
    if df.size == 0:
        return {}
    
    dataset_id = df["dataset_id"].values[0]
    columns = m_col.get_columns(cur, dataset_id)
    return calc_stats(df, columns)


@tool  
def get_desc_stats_ids(ids: list[int]) -> list[dict]:
    """
    Return descriptive statistics for all columns for the set of datapoints.
    For numerical columns, this will return the following data:
        - id: the column's id
        - name: the column's name
        - type: the column's data type
        - description: the column's description
        - min: minimum value
        - max: maximum value
        - mean: mean value
        - std: standard deviation
        - median: median value
        - 25%: 25%-percentile
        - 50%: 50%-percentile
        - 75%: 75%-percentile
    For categorical columns, this will return the following data:
        - id: the column's id
        - name: the column's name
        - type: the column's data type
        - description: the column's description
        - value_counts: counts for all unique values
    """
    cur = db_ro.cursor()
    df = DataFrame(m_it.get_items_by_id(cur, ids))
    dataset_id = df["dataset_id"].values[0]
    columns = m_col.get_columns(cur, dataset_id)
    return calc_stats(df, columns)


@tool  
def get_columns(dataset_id: int) -> list[dict]:
    """
    Return the list of columns for a the dataset
    """
    return m_col.get_columns(db_ro.cursor(), dataset_id)


@tool  
def get_column_by_name(dataset_id: int, name: str) -> dict | None:
    """
    Return the column for a given dataset and name, if it exists
    """
    cur = db_ro.cursor()
    columns = Table("columns")
    q = Query.from_(columns).select("*").where(
        Criterion.all([
            columns.name.ilike(name),
            columns.dataset_id == dataset_id
        ])
    )
    return fetchone(cur, q.get_sql())


@tool  
def get_group(group_id: str) -> dict | None:
    """
    Return the group and its members (as IDs) for the given group_id, if it exists
    """
    cur = db_ro.cursor()
    group = m_gr.get_group(cur, group_id)
    group["members"] = m_it.get_items_by_group(cur, group_id)
    return group


@tool  
def get_data_points(ids: list[int]) -> dict | None:
    """
    Return data point identified via the passed list of IDs
    """
    cur = db_ro.cursor()
    return m_it.get_items_by_id(cur, ids)


@tool  
def get_annotation(annotation_id: int) -> dict | None:
    """
    Return the annotation for a given annotation_id, if it exists
    """
    cur = db_ro.cursor()
    anno = m_anno.get_annotation(cur, annotation_id)
    print("annotation", anno)
    return anno


@tool  
def get_anno_entry(anno_entry_id: int) -> dict | None:
    """
    Return the annotation entry for a given anno_entry_id, if it exists
    """
    cur = db_ro.cursor()
    anno_entry = m_ae.get_anno_entry(cur, anno_entry_id)
    group = m_gr.get_group_by_annotation(cur, anno_entry["group_id"])
    anno_entry["data"] = group
    print("anno_entry", anno_entry)
    return anno_entry
    

@tool
def query_sql(query: str) -> list[dict]:
    """
    Execute SQL query on the database.
    Always LIMIT results unless aggregation is used.
    """
    return fetchall(db_ro.cursor(), query)

    
tools = [
    # get_schema,
    get_dataset_summary,
    get_desc_stats,
    get_desc_stats_group,
    get_desc_stats_ids,
    get_columns,
    get_column_by_name,
    get_group,
    get_data_points,
    get_annotation,
    # query_sql,
]
tools_by_name = {tool.name: tool for tool in tools}