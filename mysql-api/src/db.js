import mysql from 'mysql2/promise';

export function createPoolFromEnv() {
  const host = process.env.MYSQL_HOST ?? '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT ?? 3306);
  const user = process.env.MYSQL_USER ?? 'root';
  const password = process.env.MYSQL_PASSWORD ?? '';
  const database = process.env.MYSQL_DATABASE ?? '';

  if (!database) {
    throw new Error('MYSQL_DATABASE is required');
  }

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: true,
    dateStrings: true
  });
}

