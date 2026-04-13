const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
    db.all(
        `
            SELECT
                users.id,
                users.username,
                users.role,
                COUNT(notes.id) AS notes_count
            FROM users
            LEFT JOIN notes ON notes.user_id = users.id
            GROUP BY users.id
            ORDER BY users.username ASC
        `,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            return res.json(rows);
        }
    );
});

router.get("/:id", (req, res) => {
    db.get(
        `
            SELECT
                users.id,
                users.username,
                users.role,
                COUNT(notes.id) AS notes_count
            FROM users
            LEFT JOIN notes ON notes.user_id = users.id
            WHERE users.id = ?
            GROUP BY users.id
        `,
        [req.params.id],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.json(user);
        }
    );
});

router.post("/", (req, res) => {
    const { username, password, role = "Regular" } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    db.run(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [username.trim(), password, role],
        function createCallback(err) {
            if (err) {
                return res.status(400).json({ error: "User exists" });
            }

            return res.status(201).json({
                id: this.lastID,
                username: username.trim(),
                role
            });
        }
    );
});

router.put("/:id", (req, res) => {
    const { username, password, role = "Regular" } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    db.run(
        "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?",
        [username.trim(), password, role, req.params.id],
        function updateCallback(err) {
            if (err) {
                return res.status(400).json({ error: "Unable to update user" });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            return res.json({
                id: Number(req.params.id),
                username: username.trim(),
                role
            });
        }
    );
});

router.delete("/:id", (req, res) => {
    const { id } = req.params;

    db.serialize(() => {
        db.run("DELETE FROM notes WHERE user_id = ?", [id], (notesErr) => {
            if (notesErr) {
                return res.status(500).json({ error: "Database error" });
            }

            db.run("DELETE FROM users WHERE id = ?", [id], function deleteCallback(err) {
                if (err) {
                    return res.status(500).json({ error: "Database error" });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: "User not found" });
                }

                return res.json({ message: "User deleted successfully" });
            });
        });
    });
});

module.exports = router;
