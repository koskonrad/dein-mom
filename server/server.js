// server.js
const express       = require("express");
const fs            = require("fs");
const path          = require("path");
const cors          = require("cors");
const session       = require("express-session");
const rateLimit     = require("express-rate-limit");
const requestIp     = require("request-ip");
require('dotenv').config();

const auth          = require("./routes/auth");
const countroutes   = require("./routes/countroutes");

const app  = express();
app.set("trust proxy", true);
app.use(requestIp.mw());
const port = process.env.PORT || 3000;

// 1) IP-Middleware (muss VOR allen app.use-Aufrufen kommen, die req.clientIp brauchen)
app.use(requestIp.mw());

// 2) Statische Dateien
app.use(express.static(path.join(__dirname, "../public")));

// 3) Schöne Routen ohne .html-Endung
app.get("/:page", (req, res, next) => {
  const page    = req.params.page;
  const filePath = path.join(__dirname, "../public", `${page}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// 4) Session-Handling
app.use(session({
  name: "sid",
  secret: process.env.SESSION_SECRET || "ein super geheimnis",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24  // 1 Tag
  }
}));

// 5) CORS & JSON-Parser
app.use(cors());
app.use(express.json());

// 6) Rate-Limiter definieren
const clickLimiter = rateLimit({
  windowMs: 1000,      // 1 Sekunde
  max: 1,              // max. 1 Klick pro IP/Window
  message: { error: "Zu viele Klicks! Bitte warte kurz…" }
});
const momLimiter = rateLimit({
  windowMs: 1000,
  max: 1,
  message: { error: "Zu viele Klicks! Bitte warte kurz…" }
});

// 7) Limiter auf die beiden Klick-Routen anwenden
app.post("/click", clickLimiter);
app.post("/clickmom", momLimiter);

// 8) Auth- und Count-Routen mounten
auth(app);
const wss = countroutes(app);

// 9) HTTP-Server starten + Upgrade für WebSocket
const server = app.listen(port, () => {
  console.log(`🍔 Fettigkeit-Server läuft auf http://localhost:${port}`);
});
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit("connection", ws, request);
  });
});