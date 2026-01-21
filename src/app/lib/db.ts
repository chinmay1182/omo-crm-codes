// src/app/lib/db.ts
import mysql from 'mysql2/promise';

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Utility function for executing queries
export async function query(sql: string, values?: any[]) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, values);
    return rows;
  } finally {
    connection.release();
  }
}

// Utility function for executing transactions
export async function transaction(queries: { sql: string; values?: any[] }[]) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const results = [];
    for (const { sql, values } of queries) {
      const [result] = await connection.execute(sql, values);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Export the pool directly for special cases
export default pool;