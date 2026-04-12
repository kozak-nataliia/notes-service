const express = require("express");
const db = require("../db");

const router = express.Router();

// GET all notes
router.get("/", (req, res) => {
    db.all("SELECT * FROM notes", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        return res.json(rows);
    });
});

// GET one note by id
router.get("/:id", (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM notes WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error" });
        }

        if (!row) {
            return res.status(404).json({ error: "Note not found" });
        }

        return res.json(row);
    });
});

// CREATE note
router.post("/", (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
    }

    db.run(
        "INSERT INTO notes (title, content) VALUES (?, ?)",
        [title, content],
        function insertCallback(err) {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            return res.status(201).json({
                id: this.lastID,
                title,
                content
            });
        }
    );
});

// UPDATE note
router.put("/:id", (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
    }

    db.run(
        "UPDATE notes SET title = ?, content = ? WHERE id = ?",
        [title, content, id],
        function updateCallback(err) {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "Note not found" });
            }

            return res.json({
                id: Number(id),
                title,
                content
            });
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