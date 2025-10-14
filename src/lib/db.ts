import mysql from 'mysql2/promise';

// Configuração da conexão com o banco de dados
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'finances',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 30000,
  acquireTimeout: 30000,
  timeout: 30000,
};

// Pool de conexões
let pool: mysql.Pool | null = null;

export const getPool = (): mysql.Pool => {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
    
    // Ping periodicamente para manter conexão viva
    setInterval(async () => {
      try {
        const connection = await pool?.getConnection();
        if (connection) {
          await connection.ping();
          connection.release();
        }
      } catch (error) {
        console.error('Erro ao fazer ping no banco:', error);
      }
    }, 60000); // A cada 1 minuto
  }
  return pool;
};

export const query = async <T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T> => {
  const [results] = await getPool().query(sql, params || []);
  return results as T;
};

export const queryOne = async <T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T | null> => {
  const results = await query<T[]>(sql, params);
  return results.length > 0 ? results[0] : null;
};

export const transaction = async <T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> => {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Helper para executar query com conexão específica (para transações)
export const queryWithConnection = async <T = unknown>(
  connection: mysql.PoolConnection,
  sql: string,
  params?: unknown[]
): Promise<T> => {
  const [results] = await connection.query(sql, params || []);
  return results as T;
};

export default { getPool, query, queryOne, transaction, queryWithConnection };
