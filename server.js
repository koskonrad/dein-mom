const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();
const port = 3000;

// Pfad zur Datei, in der der Fettigkeits-Count gespeichert wird
const countFilePath = path.join(__dirname, "fettigkeitCount.json");


function getFromFile() {
  const data = fs.readFileSync(countFilePath, "utf8");
  return JSON.parse(data).count || 0;
}

let count = getFromFile()

// Funktion zum Lesen des aktuellen Zählers
function getFettigkeitCount() {
  return count
}

// Funktion zum Speichern des Zählers in der Datei
const saveFettigkeitCount = (count) => {
  const data = JSON.stringify({ count });
  fs.writeFileSync(countFilePath, data, "utf8");
};

// Statische Dateien aus dem "public"-Ordner bereitstellen
app.use(express.static(path.join(__dirname, "public")));

// Middleware
app.use(cors());
app.use(express.json());

// GET: aktuellen Fettigkeits-Count abrufen
app.get("/count", (req, res) => {
  const count = getFettigkeitCount();
  res.json({ count });
});

// POST: Fettigkeit erhöhen
app.post("/click", (req, res) => {
  const currentCount = getFettigkeitCount();
  const newCount = currentCount + 1;
  count = count + 1
  // Alle WebSocket-Clients benachrichtigen, dass der Zähler erhöht wurde
  broadcastFettigkeitCount(newCount);
  res.json({ count: newCount });
});

// WebSocket Server erstellen
const wss = new WebSocket.Server({ noServer: true });

// WebSocket-Client-Verbindungen
wss.on("connection", (ws) => {
  console.log("Neuer WebSocket-Client verbunden!");
  
  // Initialer Zähler an den Client senden
  ws.send(JSON.stringify({ count: getFettigkeitCount() }));

  // WebSocket-Nachrichten empfangen
  ws.on("message", (message) => {
    console.log("Nachricht vom Client erhalten:", message);
  });
});

// Broadcast-Funktion: Benachrichtigt alle WebSocket-Clients
const broadcastFettigkeitCount = (newCount) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ count: newCount }));
    }
  });
};

setInterval(() => {
  saveFettigkeitCount(newCount);
}, 60 * 1000)

// WebSocket-Verbindung beim HTTP-Upgrade einrichten
app.server = app.listen(port, () => {
  console.log(`🍔 Fettigkeit-Server läuft auf http://localhost:${port}`);
});

app.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
