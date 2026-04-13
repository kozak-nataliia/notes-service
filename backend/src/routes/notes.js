const express = require("express");
const db = require("../db");
const { requireAuth, isAdmin } = require("../middleware/auth");

const router = express.Router();

function loadNoteById(noteId) {
    return new Promise((resolve, reject) => {
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
            [noteId],
            (err, note) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(note || null);
            }
        );
    });
}

router.get("/", requireAuth, (req, res) => {
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
    } else if (!isAdmin(req.currentUser)) {
        query += " WHERE notes.user_id = ?";
        params.push(req.currentUser.id);
    }

    query += " ORDER BY notes.updated_at DESC, notes.id DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        return res.json(rows);
    });
});

router.get("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const row = await loadNoteById(id);

        if (!row) {
            return res.status(404).json({ error: "Note not found" });
        }

        if (!isAdmin(req.currentUser) && Number(row.user_id) !== req.currentUser.id) {
            return res.status(403).json({ error: "You can only view your own notes" });
        }

        return res.json(row);
    } catch (error) {
        return res.status(500).json({ error: "Database error" });
    }
});

router.post("/", requireAuth, (req, res) => {
    const { title, content, user_id: userId, tags = "" } = req.body;
    const ownerId = isAdmin(req.currentUser) && userId != null
        ? Number(userId)
        : req.currentUser.id;

    if (!title || !content) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.run(
        `
            INSERT INTO notes (title, content, tags, updated_at, user_id)
            VALUES (?, ?, ?, datetime('now'), ?)
        `,
        [title.trim(), content.trim(), tags.trim(), ownerId],
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

router.put("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;
    const { title, content, user_id: userId, tags = "" } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
    }

    try {
        const existingNote = await loadNoteById(id);

        if (!existingNote) {
            return res.status(404).json({ error: "Note not found" });
        }

        if (!isAdmin(req.currentUser) && Number(existingNote.user_id) !== req.currentUser.id) {
            return res.status(403).json({ error: "You can only edit your own notes" });
        }

        const nextOwnerId = isAdmin(req.currentUser) && userId != null
            ? Number(userId)
            : existingNote.user_id;

        db.run(
            `
                UPDATE notes
                SET title = ?, content = ?, tags = ?, user_id = ?, updated_at = datetime('now')
                WHERE id = ?
            `,
            [title.trim(), content.trim(), tags.trim(), nextOwnerId, id],
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
    } catch (error) {
        return res.status(500).json({ error: "Database error" });
    }
});

router.delete("/:id", requireAuth, async (req, res) => {
    const { id } = req.params;

    try {
        const existingNote = await loadNoteById(id);

        if (!existingNote) {
            return res.status(404).json({ error: "Note not found" });
        }

        if (!isAdmin(req.currentUser) && Number(existingNote.user_id) !== req.currentUser.id) {
            return res.status(403).json({ error: "You can only delete your own notes" });
        }

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
    } catch (error) {
        return res.status(500).json({ error: "Database error" });
    }
});

module.exports = router;
