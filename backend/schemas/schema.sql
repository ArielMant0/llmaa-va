CREATE TABLE datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    table_name TEXT NOT NULL
);

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE columns (
    id SERIAL PRIMARY KEY,
    dataset_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    dtype TEXT NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    type INTEGER NOT NULL,
    dataset_id INTEGER NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

CREATE TABLE annotations (
    id TEXT PRIMARY KEY,
    dataset_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
);

CREATE TABLE anno_entries (
    id TEXT PRIMARY KEY,
    annotation_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    text TEXT DEFAULT NULL,
    type INTEGER NOT NULL,
    source INTEGER NOT NULL,
    data JSONB DEFAULT NULL,
    FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);

CREATE TABLE anno_group_links (
    id SERIAL PRIMARY KEY,
    annotation_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
);

CREATE TABLE anno_column_links (
    id SERIAL PRIMARY KEY,
    anno_entry_id TEXT NOT NULL,
    column_id INTEGER NOT NULL,
    value FLOAT DEFAULT NULL,
    FOREIGN KEY (anno_entry_id) REFERENCES anno_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
);

CREATE TABLE anno_anno_links (
    id SERIAL PRIMARY KEY,
    anno_entry_id TEXT NOT NULL,
    annotation_id TEXT NOT NULL,
    FOREIGN KEY (anno_entry_id) REFERENCES anno_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (annotation_id) REFERENCES annotations(id) ON DELETE CASCADE
);
