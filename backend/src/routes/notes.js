const express = require("express");
const db = require("../db");

const router = express.Router();

// GET all notes
router.get("/", (req, res) => {
    const { user_id: userId } = req.query;
    const params = [];
    let query = `
        SELECT
            notes.id,
            notes.title,
            notes.content,
            notes.tags,
            notes.updated_at,
            notes.user_id,
            users.username
        FROM notes
        LEFT JOIN users ON users.id = notes.user_id
    `;

    if (userId) {
        query += " WHERE notes.user_id = ?";
        params.push(userId);
    }

    query += " ORDER BY notes.updated_at DESC, notes.id DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        return res.json(rows);
    });
});

// GET one note by id
router.get("/:id", (req, res) => {
    const { id } = req.params;

    db.get(
        `
            SELECT
                notes.id,
                notes.title,
                notes.content,
                notes.tags,
                notes.updated_at,
                notes.user_id,
                users.username
            FROM notes
            LEFT JOIN users ON users.id = notes.user_id
            WHERE notes.id = ?
        `,
        [id],
        (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        if (!row) {
            return res.status(404).json({ error: "Note not found" });
        }

        return res.json(row);
        }
    );
});

// CREATE note
router.post("/", (req, res) => {
    const { title, content, user_id: userId, tags = "" } = req.body;

    if (!title || !content || userId == null) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.run(
        `
            INSERT INTO notes (title, content, tags, updated_at, user_id)
            VALUES (?, ?, ?, datetime('now'), ?)
        `,
        [title.trim(), content.trim(), tags.trim(), userId],
        function insertCallback(err) {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            db.get(
                `
                    SELECT
                        notes.id,
                        notes.title,
                        notes.content,
                        notes.tags,
                        notes.updated_at,
                        notes.user_id,
                        users.username
                    FROM notes
                    LEFT JOIN users ON users.id = notes.user_id
                    WHERE notes.id = ?
                `,
                [this.lastID],
                (selectErr, row) => {
                    if (selectErr) {
                        return res.status(500).json({ error: "Database error" });
                    }

                    return res.status(201).json(row);
                }
            );
        }
    );
});

// UPDATE note
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { title, content, user_id: userId, tags = "" } = req.body;

    if (!title || !content || userId == null) {
        return res.status(400).json({ error: "Title, content and owner are required" });
    }

    db.run(
        `
            UPDATE notes
            SET title = ?, content = ?, tags = ?, user_id = ?, updated_at = datetime('now')
            WHERE id = ?
        `,
        [title.trim(), content.trim(), tags.trim(), userId, id],
        function updateCallback(err) {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "Note not found" });
            }

            db.get(
                `
                    SELECT
                        notes.id,
                        notes.title,
                        notes.content,
                        notes.tags,
                        notes.updated_at,
                        notes.user_id,
                        users.username
                    FROM notes
                    LEFT JOIN users ON users.id = notes.user_id
                    WHERE notes.id = ?
                `,
                [id],
                (selectErr, row) => {
                    if (selectErr) {
                        return res.status(500).json({ error: "Database error" });
                    }

                    return res.json(row);
                }
            );
        }
    );
});

// DELETE note
router.delete("/:id", (req, res) => {
    const { id } = req.params;

    db.run(
        "DELETE FROM notes WHERE id = ?",
        [id],
        function deleteCallback(err) {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "Note not found" });
            }

            return res.json({ message: "Note deleted successfully" });
        }
    );
});

module.exports = router;
