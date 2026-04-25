import config
from psycopg import connect
from psycopg.rows import dict_row

conn_params = f"host=localhost dbname={config.DB_NAME} user={config.DB_USER} password={config.DB_PW}"

db = connect(conn_params, row_factory=dict_row)
db_ro = connect(conn_params, row_factory=dict_row)
db_ro.set_read_only(True)
