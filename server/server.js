const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const app = express();
const port = 3000;

require('dotenv').config()

const pool = require("./db");
const session = require("express-session");
const auth = require("./routes/auth");
const countroutes = require("./routes/countroutes");

// Statische Dateien aus "public"
app.use(express.static(path.join(__dirname, "../public")));

// Schöne Routen ohne .html
app.get("/:page", (req, res, next) => {
  const page    = req.params.page;
  const filePath = path.join(__dirname, "../public", `${page}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET || "ein super geheimnis",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24 // 1 Tag
  }
}));

// Middleware
app.use(cors());
app.use(express.json());

auth(app);
const wss = countroutes(app);

// HTTP-Server starten und WebSocket-Upgrade abfangen
const server = app.listen(port, () => {
  console.log(`🍔 Fettigkeit-Server läuft auf http://localhost:${port}`);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});