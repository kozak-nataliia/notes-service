const express = require("express");
const cors = require("cors");

require("./db");

const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const usersRoutes = require("./routes/users");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API is working");
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/users", usersRoutes);

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
