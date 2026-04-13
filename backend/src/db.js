const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./notes.db");

function ensureColumn(tableName, columnName, definition) {
    db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
        if (err) {
            console.error(`Failed to inspect ${tableName}:`, err.message);
            return;
        }

        const hasColumn = columns.some((column) => column.name === columnName);

        if (!hasColumn) {
            db.run(
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
                (alterErr) => {
                    if (alterErr) {
                        console.error(
                            `Failed to add ${columnName} to ${tableName}:`,
                            alterErr.message
                        );
                    }
                }
            );
        }
    });
}

function ensureUpdatedAtColumn() {
    db.all("PRAGMA table_info(notes)", (err, columns) => {
        if (err) {
            console.error("Failed to inspect notes:", err.message);
            return;
        }

        const hasColumn = columns.some((column) => column.name === "updated_at");

        if (!hasColumn) {
            db.run("ALTER TABLE notes ADD COLUMN updated_at TEXT", (alterErr) => {
                if (alterErr) {
                    console.error(
                        "Failed to add updated_at to notes:",
                        alterErr.message
                    );
                    return;
                }

                db.run(
                    "UPDATE notes SET updated_at = datetime('now') WHERE updated_at IS NULL"
                );
            });
        }
    });
}

db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    // users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'Regular'
        )
    `);

    // notes table with user relation
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
