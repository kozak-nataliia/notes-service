const express = require("express");
const db = require("../db");

const router = express.Router();

router.post("/register", (req, res) => {
    const { username, password, role = "Regular" } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    db.run(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [username.trim(), password, role],
        function registerCallback(err) {
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

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    db.get(
        "SELECT id, username, role FROM users WHERE username = ? AND password = ?",
        [username.trim(), password],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            return res.json(user);
        }
    );
});

module.exports = router;
