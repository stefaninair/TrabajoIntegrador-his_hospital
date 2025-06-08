const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,  // Cambiá este número si necesitás más o menos conexiones
  queueLimit: 0
});

module.exports = (req, res, next) => {
  req.db = pool;
  next();
};
