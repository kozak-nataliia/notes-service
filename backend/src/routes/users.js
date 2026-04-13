const express = require("express");
const db = require("../db");
const { requireAuth, requireAdmin, isAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, requireAdmin, (req, res) => {
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

router.get("/:id", requireAuth, (req, res) => {
    if (!isAdmin(req.currentUser) && Number(req.params.id) !== req.currentUser.id) {
        return res.status(403).json({ error: "You can only view your own profile" });
    }

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

router.post("/", requireAuth, requireAdmin, (req, res) => {
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

router.put("/:id", requireAuth, (req, res) => {
    const { username, password, role = "Regular" } = req.body;
    const isSelfUpdate = Number(req.params.id) === req.currentUser.id;

    if (!isAdmin(req.currentUser) && !isSelfUpdate) {
        return res.status(403).json({ error: "You can only edit your own profile" });
    }

    if (!username) {
        return res.status(400).json({ error: "Username is required" });
    }

    const nextRole = isAdmin(req.currentUser) ? role : req.currentUser.role;
    const trimmedUsername = username.trim();
    const hasPasswordUpdate = Boolean(password);
    const query = hasPasswordUpdate
        ? "UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?"
        : "UPDATE users SET username = ?, role = ? WHERE id = ?";
    const params = hasPasswordUpdate
        ? [trimmedUsername, password, nextRole, req.params.id]
        : [trimmedUsername, nextRole, req.params.id];

    db.run(query, params, function updateCallback(err) {
        if (err) {
            return res.status(400).json({ error: "Unable to update user" });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        return res.json({
            id: Number(req.params.id),
            username: trimmedUsername,
            role: nextRole
        });
    });
});

router.delete("/:id", requireAuth, requireAdmin, (req, res) => {
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
