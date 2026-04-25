from pypika import Table, Query

def get_items_diff(existing: list, update: list, key: str):
    to_add = []
    for c in update:
        matches = [d for d in existing if d[key] == c[key]]
        if len(matches) == 0:
            to_add.append(c[key])

    to_del = []
    for c in existing:
        matches = [d for d in update if d[key] == c[key]]
        if len(matches) == 0:
            to_del.append(c[key])

    return (to_add, to_del)


def make_sql_params(list, template="%s"):
    return ", ".join([template for _ in list])


def make_dict_params(fields):
    return ", ".join([f"%({f})s" for f in fields])


def fetchone(conn, query: str, params=None):
    if params is None:
        return conn.execute(query).fetchone()
    return conn.execute(query, params).fetchone()


def fetchall(conn, query: str):
    return conn.execute(query).fetchall()


def fetchall_params(conn, query: str, params):
    return conn.execute(query, params).fetchall()


def run(conn, query: str, params=None):
    if params is None:
        return conn.execute(query)
    return conn.execute(query, params)


def run_many(conn, query: str, params):
    return conn.executemany(query, params)


def insert_values(conn, table: str, fields: list[str], data: list, return_field=None):
    if return_field is not None:
        result = fetchone(
            conn,
            f"INSERT INTO {table} ({', '.join(fields)}) " + 
            f"VALUES ({make_sql_params(fields)}) " +
            f"RETURNING {return_field};",
            data
        )[return_field]
        return None if result is None else result[return_field]
    
    return run(
        conn,
        f"INSERT INTO {table} ({', '.join(fields)}) " + 
        f"VALUES ({make_sql_params(fields)})",
        data
    )


def insert_values_many(conn, table: str, fields: list[str], data: list[list]):
    if len(data) == 0:
        return conn
    
    return run_many(
        conn,
        f"INSERT INTO {table} ({', '.join(fields)}) " + 
        f"VALUES ({make_sql_params(fields)})",
        data
    )


def insert_dict(conn, table: str, fields: list[str], data: dict, return_field=None):
    if return_field is not None:
        result = fetchone(
            conn,
            f"INSERT INTO {table} ({', '.join(fields)}) " + 
            f"VALUES ({make_dict_params(fields)}) " +
            f"RETURNING {return_field};",
            data
        )
        return None if result is None else result[return_field]
    
    return run(
        conn,
        f"INSERT INTO {table} ({', '.join(fields)}) " + 
        f"VALUES ({make_dict_params(fields)})",
        data
    )


def insert_dict_many(conn, table: str, fields: list[str], data: list[dict]):
    if len(data) == 0:
        return conn

    return run_many(
        conn,
        f"INSERT INTO {table} ({', '.join(fields)}) " + 
        f"VALUES ({make_dict_params(fields)})",
        data
    )


def delete_id(conn, table: str, id):
    t = Table(table)
    return run(conn, Query.from_(t).delete().where(t.id == id).get_sql())


def delete_id_many(conn, table: str, ids: list):
    if len(ids) == 0:
        return conn
    
    t = Table(table)
    return run(conn, Query.from_(t).delete().where(t.id.isin(ids)).get_sql())


def update_dict(conn, table: str, fields: list[str], data: dict):
    t = Table(table)
    q = Query.update(t)
    
    # for each field, set current value
    for f in fields:
        if f in data:
            q = q.set(f, data[f])

    # limit to only this row
    q = q.where(t.id == data["id"])
    
    return run(conn, q.get_sql())


def update_dict_many(conn, table: str, fields: list[str], data: list[dict]):
    if len(data) == 0:
        return conn

    for d in data:
        update_dict(conn, table, fields, d)
    return conn
