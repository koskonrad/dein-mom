// routes/auth.js
const pool              = require("../db");
const { authenticate }  = require("../authenticate");
const bcrypt            = require("bcryptjs");
const { lookupLocation }= require("../lib/geo");

module.exports = function (app) {
  // ---------------------------------------
  // 1) LOGIN
  // ---------------------------------------
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    // Benutzer suchen
    const [rows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE username = ?",
      [username]
    );
    if (rows.length === 0) return res.status(401).send("Ungültig");

    const user = rows[0];
    // Passwort prüfen
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).send("Ungültig");

    // Session setzen
    req.session.userId = user.id;
    res.sendStatus(200);
  });

  // ---------------------------------------
  // 2) LOGOUT
  // ---------------------------------------
  app.get("/logout", (req, res) => {
    req.session.destroy(err => {
      if (err) return res.sendStatus(500);
      res.clearCookie("sid");
      res.redirect("/");
    });
  });

  // ---------------------------------------
  // 3) REGISTER (SIGNUP) + IP- & Geolocation-Log
  // ---------------------------------------
  app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    // 3.1) Existenz prüfen
    const [existing] = await pool.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );
    if (existing.length > 0) {
      return res.status(409).send("Benutzer existiert bereits");
    }

    // 3.2) neuen User anlegen
    const password_hash = await bcrypt.hash(password, 10);
    const [addUser] = await pool.execute(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, password_hash]
    );
    const userId = addUser.insertId;  // <-- korrekte ID!

    // 3.3) IP & Location erfassen
    const ip = req.clientIp;  // vorausgesetzt: in server.js ist request-ip middleware aktiv
    let location = {};
    try {
      location = await lookupLocation(ip);
    } catch (e) {
      console.warn("Geolookup fehlgeschlagen:", e);
    }

    // 3.4) in signup_events speichern
    await pool.execute(
      `INSERT INTO signup_events
         (user_id, ip, country, region, city, latitude, longitude, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        ip,
        location.country  || null,
        location.region   || null,
        location.city     || null,
        location.latitude || null,
        location.longitude|| null
      ]
    );

    // 3.5) Zähler-Tabelle initialisieren
    await pool.execute(
      "INSERT INTO user_counts (user_id) VALUES (?)",
      [userId]
    );

    // 3.6) Session setzen & Antwort
    req.session.userId = userId;
    res.sendStatus(201);
  });

  // ---------------------------------------
  // 4) „/me“-Route (Status abfragen)
  // ---------------------------------------
  app.get("/me", authenticate, async (req, res) => {
    const [rows] = await pool.query(
      "SELECT username FROM users WHERE id = ?",
      [req.session.userId]
    );
    if (rows.length === 0) return res.sendStatus(401);
    res.json({ username: rows[0].username });
  });
};