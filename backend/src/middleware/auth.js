const db = require("../db");

function loadUserById(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT id, username, role FROM users WHERE id = ?",
            [userId],
            (err, user) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(user || null);
            }
        );
    });
}

async function attachCurrentUser(req, res, next) {
    const userId = req.header("x-user-id");

    if (!userId) {
        req.currentUser = null;
        next();
        return;
    }

    try {
        const user = await loadUserById(userId);
        req.currentUser = user;
        next();
    } catch (error) {
        res.status(500).json({ error: "Database error" });
    }
}

function requireAuth(req, res, next) {
    if (!req.currentUser) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.currentUser || req.currentUser.role !== "Admin") {
        res.status(403).json({ error: "Admin access required" });
        return;
    }

    next();
}

function isAdmin(user) {
    return Boolean(user && user.role === "Admin");
}

module.exports = {
    attachCurrentUser,
    requireAuth,
    requireAdmin,
    isAdmin
};
