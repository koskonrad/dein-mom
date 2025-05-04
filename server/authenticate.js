const pool = require("./db");

let publicUserId = null
async function createPublicUserIfNotExists() {
    if (publicUserId) return;

    const [rows] = await pool.query(
        `SELECT * FROM users WHERE username = ?`,
        ['public']
    );
    
    if (rows.length === 0) {
        const [addUser] = await pool.execute(
            "INSERT INTO users (username, password_hash) VALUES (?, ?)",
            ['public', 'hallo ich existiere nicht']
        );

        const id = addUser.insertId

        await pool.execute("INSERT INTO user_counts (user_id) VALUES (?)", [id]);

        publicUserId = id
        return;
    }
    publicUserId = rows[0].id
}

async function authenticate(req, res, next) {
    if (!req.session.userId) {
        console.log('Creating')
        await createPublicUserIfNotExists()
        console.log('done')
        if (!publicUserId) {
            return res.sendStatus(401);
        }
        
        req.session.userId = publicUserId
    }
    next();
}

  
module.exports = {
    authenticate,
    getPublicUserId() {
        return publicUserId
    }
};