const pool = require("../db");
const {authenticate} = require("../authenticate");

const bcrypt = require("bcryptjs");

module.exports = function (app){
    // POST /login
    app.post("/login", async (req, res) => {
        const { username, password } = req.body;
        // 1) Benutzer suchen
        const [rows] = await pool.query(
        "SELECT id, password_hash FROM users WHERE username = ?",
        [username]
        );
        if (rows.length === 0) return res.status(401).send("Ungültig");
        const user = rows[0];
        // 2) Passwort prüfen
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).send("Ungültig");
        // 3) session setzen
        req.session.userId = user.id;
        res.sendStatus(200);
    });
    app.get("/logout", (req, res) => {
        req.session.destroy(err => {
          if (err) return res.sendStatus(500);
          res.clearCookie("sid");
          res.redirect('/');
        });
    });

    // register
    app.post("/register", async (req, res) => {
        const { username, password } = req.body;
        
        const [rows] = await pool.query(
            "SELECT id FROM users WHERE username = ?",
            [username]
        );
        if (rows.length > 0) return res.status(409).send("Benutzer existiert bereits");

        const password_hash = await bcrypt.hash(password, 10);
        
        const [addUser] = await pool.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            [username, password_hash]
        );

        const id = addUser.insertId

        await pool.execute(
            "INSERT INTO user_counts (user_id) VALUES (?)",
            [id]
        );
        res.sendStatus(201);
    }); 


    // me route
    app.get("/me", authenticate, async (req, res) => {
        const [rows] = await pool.query(
            "SELECT username FROM users WHERE id = ?",
            [req.session.userId]
        );
        if (rows.length === 0) return res.sendStatus(401);
        res.json({ username: rows[0].username });
    });
};