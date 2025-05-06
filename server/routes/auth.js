// routes/auth.js
const pool               = require("../db");
const { authenticate }   = require("../authenticate");
const bcrypt             = require("bcryptjs");
const requestIp          = require("request-ip");
const { lookupLocation } = require("../lib/geo");

module.exports = function (app) {
  // Login-Route
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

    // 3) Session setzen
    req.session.userId = user.id;

    // 4) IP & Location ermitteln
    const ip = req.clientIp;
    let loc = {};
    try {
      loc = await lookupLocation(ip);
    } catch {
      loc = {};
    }

    // 5) Login-Event speichern (ohne Lat/Long)
    await pool.execute(
      `INSERT INTO login_events
         (user_id, ip, country, region, city, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        user.id,
        ip,
        loc.country || null,
        loc.region  || null,
        loc.city    || null
      ]
    );

    res.sendStatus(200);
  });

  // Logout-Route
  app.get("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) return res.sendStatus(500);
      res.clearCookie("sid");
      res.redirect("/");
    });
  });

  // Register-Route
  app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    // 1) Existenz prüfen
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).send("Benutzer existiert bereits");
    }

    // 2) User anlegen
    const password_hash = await bcrypt.hash(password, 10);
    const [addUser] = await pool.execute(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, password_hash]
    );
    const userId = addUser.insertId;

    // 3) IP & Location ermitteln
    const ip = req.clientIp;
    let loc = {};
    try {
      loc = await lookupLocation(ip);
    } catch {
      loc = {};
    }

    // 4) Signup-Event speichern
    await pool.execute(
      `INSERT INTO signup_events
         (user_id, ip, country, region, city, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        ip,
        loc.country || null,
        loc.region  || null,
        loc.city    || null
      ]
    );

    // 5) Zähler initialisieren
    await pool.execute(
      "INSERT INTO user_counts (user_id) VALUES (?)",
      [userId]
    );

    // 6) Session setzen
    req.session.userId = userId;
    res.sendStatus(201);
  });

  // Me-Route
  app.get("/me", authenticate, async (req, res) => {
    const [rows] = await pool.query(
      "SELECT username FROM users WHERE id = ?",
      [req.session.userId]
    );
    if (rows.length === 0) return res.sendStatus(401);
    res.json({ username: rows[0].username });
  });
};
