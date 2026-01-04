/**
 * Server configuration
 */

export const config = {
  port: parseInt(process.env.PORT ?? "3344", 10),
  host: process.env.HOST ?? "0.0.0.0",
  dbPath: process.env.DB_PATH ?? "./data/forge.db",
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  taskConcurrency: 1,
};
