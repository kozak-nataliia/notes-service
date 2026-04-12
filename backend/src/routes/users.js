const express = require("express");
const db = require("../db");

const router = express.Router();

// register
router.post("/register", (req, res) => {
    const { username, password } = req.body;

    db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, password],
        function (err) {
            if (err) {
                return res.status(400).json({ error: "User exists" });
            }

            res.json({ id: this.lastID, username });
        }
    );
});

// login (simple)
router.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, user) => {
            if (!user) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            res.json({ id: user.id, username: user.username });
        }
    );
});

module.exports = router;