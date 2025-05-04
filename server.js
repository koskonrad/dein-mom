const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
const port = 3000;

// Pfade zu den beiden Zähler-Dateien
const countFilePath    = path.join(__dirname, "fettigkeitCount.json");
const countMomFilePath = path.join(__dirname, "countmom.json");

// Hilfsfunktionen zum Einlesen
function getFettigkeitCount() {
  const raw = fs.readFileSync(countFilePath, "utf8");
  return JSON.parse(raw).count || 0;
}

function getMomCount() {
  const raw = fs.readFileSync(countMomFilePath, "utf8");
  return JSON.parse(raw).countmom || 0;
}

// Aktuelle Werte in Variablen
let count    = getFettigkeitCount();
let countmom = getMomCount();

// Hilfsfunktionen zum Speichern
const saveFettigkeitCount = (c) => {
  fs.writeFileSync(countFilePath, JSON.stringify({ count: c }), "utf8");
};

const saveMomCount = (c) => {
  fs.writeFileSync(countMomFilePath, JSON.stringify({ countmom: c }), "utf8");
};

// Statische Dateien aus "public"
app.use(express.static(path.join(__dirname, "public")));

// Schöne Routen ohne .html
app.get("/:page", (req, res, next) => {
  const page    = req.params.page;
  const filePath = path.join(__dirname, "public", `${page}.html`);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    next();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// REST-Endpoints für count
app.get("/count", (req, res) => {
  res.json({ count: getFettigkeitCount() });
});

app.post("/click", (req, res) => {
  count++;
  saveFettigkeitCount(count);
  broadcastFettigkeitCount(count);
  res.json({ count });
});

// REST-Endpoints für countmom
app.get("/countmom", (req, res) => {
  res.json({ countmom: getMomCount() });
});

app.post("/clickmom", (req, res) => {
  countmom++;
  saveMomCount(countmom);
  broadcastMomCount(countmom);
  res.json({ countmom });
});

// WebSocket-Server (kein eigener HTTP-Port)
const wss = new WebSocket.Server({ noServer: true });

wss.on("connection", (ws) => {
  console.log("Neuer WebSocket-Client verbunden!");
  // Initial beide Werte senden
  ws.send(JSON.stringify({
    count:    getFettigkeitCount(),
    countmom: getMomCount()
  }));

  ws.on("message", (msg) => {
    console.log("Nachricht vom Client:", msg);
  });
});

// Broadcast-Funktionen
const broadcastFettigkeitCount = (newCount) => {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ count: newCount }));
    }
  }
};

const broadcastMomCount = (newCount) => {
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ countmom: newCount }));
    }
  }
};

// Periodisch beide Zähler speichern
setInterval(() => {
  saveFettigkeitCount(count);
  saveMomCount(countmom);
}, 60 * 1000);

// HTTP-Server starten und WebSocket-Upgrade abfangen
const server = app.listen(port, () => {
  console.log(`🍔 Fettigkeit-Server läuft auf http://localhost:${port}`);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
