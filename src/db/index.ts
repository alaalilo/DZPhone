import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.ts";

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const portValue = Number(process.env.SQL_PORT || 5432);
    const port = Number.isInteger(portValue) && portValue > 0 && portValue <= 65535
      ? portValue
      : 5432;
    const sslEnabled = /^(1|true|require)$/i.test(
      process.env.SQL_SSL || process.env.DATABASE_SSL || ""
    );

    global._postgresPool = new Pool({
      ...(databaseUrl
        ? { connectionString: databaseUrl }
        : {
            host: process.env.SQL_HOST,
            port,
            user: process.env.SQL_USER || process.env.SQL_ADMIN_USER,
            password: process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD,
            database: process.env.SQL_DB_NAME,
          }),
      ...(sslEnabled
        ? {
            ssl: {
              rejectUnauthorized: !/^(0|false)$/i.test(
                process.env.SQL_SSL_REJECT_UNAUTHORIZED || "true"
              ),
            },
          }
        : {}),
      max: 10,
      connectionTimeoutMillis: 15000,
      idleTimeoutMillis: 30000,
      application_name: "dzphone-api",
    });

    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();

export const db = drizzle(pool, { schema });

export function hasDatabaseConfiguration(): boolean {
  if (process.env.DATABASE_URL?.trim()) return true;
  return Boolean(
    process.env.SQL_HOST?.trim() &&
      (process.env.SQL_USER?.trim() || process.env.SQL_ADMIN_USER?.trim()) &&
      (process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD) &&
      process.env.SQL_DB_NAME?.trim()
  );
}

export async function checkDatabaseConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
