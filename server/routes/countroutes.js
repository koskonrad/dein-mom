const { authenticate, getPublicUserId } = require("../authenticate");
const pool = require("../db");
const WebSocket = require("ws");



module.exports = function (app) {


  async function getCountSum(row) {
    const [rows] = await pool.query(`
      SELECT SUM(\`${row}\`) AS totalCount FROM user_counts
    `);

    return parseInt(rows[0].totalCount) || 0
  }


  async function getCount(row, userId) {
    const [rows] = await pool.query(
      `SELECT ${row} FROM user_counts WHERE user_id = ?`,
      [userId]
    );
    return rows[0][row]
  }

  async function increaseCount(row, userId) {
    await pool.query(
      `UPDATE user_counts SET ${row} = ${row} + 1 WHERE user_id = ?`,
      [userId]
    );
    broadcast()
  }

  app.get("/fettigkeit/total", async (req, res) => {
    try {
      res.json({ count: await getCountSum('fettig_count') });
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });

  app.get("/fettigkeit", authenticate, async (req, res) => {
    res.json({ count: await getCount('fettig_count', req.session.userId) });
  });

  app.post("/fettigkeit", authenticate, async (req, res) => {
    await increaseCount('fettig_count', req.session.userId)
    res.sendStatus(200);
  });


  app.get("/mom/total", async (req, res) => {
    try {
      res.json({ count: await getCountSum('mom_count') });
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });

  app.get("/mom", authenticate, async (req, res) => {
    res.json({ count: await getCount('mom_count', req.session.userId) });
  });

  app.post("/mom", authenticate, async (req, res) => {
    await increaseCount('mom_count', req.session.userId)
    res.sendStatus(200);
  });




  const wss = new WebSocket.Server({ noServer: true });

  wss.on("connection", async (ws) => {
    console.log("Neuer WebSocket-Client verbunden!");
    // Initial beide Werte senden
    ws.send(JSON.stringify({
      mom_count: await getCountSum('mom_count'),
      fettig_count: await getCountSum('fettig_count')
    }));

    ws.on("message", (msg) => {
      console.log("Nachricht vom Client:", msg);
    });
  });

  // Broadcast-Funktionen
  const broadcast = async (newCount) => {
    const mom_count = await getCountSum('mom_count')
    const fettig_count = await getCountSum('fettig_count')
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          mom_count,
          fettig_count
        }));
      }
    }
  };

  return wss;
}