const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./notes.db");

function ensureColumn(tableName, columnName, definition) {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
            return;
        }

        const hasColumn = columns.some((column) => column.name === columnName);

        if (!hasColumn) {
            db.run(
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
                () => {}
            );
        }
    });
}

function ensureUpdatedAtColumn() {
    db.all("PRAGMA table_info(notes)", (err, columns) => {
        if (err) {
            return;
        }

        const hasColumn = columns.some((column) => column.name === "updated_at");

        if (!hasColumn) {
            db.run("ALTER TABLE notes ADD COLUMN updated_at TEXT", (alterErr) => {
                if (!alterErr) {
                db.run(
                    "UPDATE notes SET updated_at = datetime('now') WHERE updated_at IS NULL"
                );
                }
            });
        }
    });
}

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'Regular'
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            tags TEXT DEFAULT '',
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    ensureColumn("users", "role", "TEXT DEFAULT 'Regular'");
    ensureColumn("notes", "tags", "TEXT DEFAULT ''");
    ensureUpdatedAtColumn();
});

module.exports = db;
