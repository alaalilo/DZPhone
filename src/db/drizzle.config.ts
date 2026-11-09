import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL?.trim();
const sqlHost = process.env.SQL_HOST?.trim();
const sqlDbName = process.env.SQL_DB_NAME?.trim();
const user = process.env.SQL_ADMIN_USER || process.env.SQL_USER;
const password = process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD;
const port = Number(process.env.SQL_PORT || 5432);

if (!databaseUrl && (!sqlHost || !sqlDbName || !user || !password)) {
  throw new Error(
    "Set DATABASE_URL or SQL_HOST, SQL_PORT, SQL_DB_NAME, SQL_USER and SQL_PASSWORD before running Drizzle commands."
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    ...(databaseUrl
      ? { url: databaseUrl }
      : {
          host: sqlHost!,
          port: Number.isInteger(port) && port > 0 && port <= 65535 ? port : 5432,
          user: user!,
          password: password!,
          database: sqlDbName!,
          ssl: /^(1|true|require)$/i.test(process.env.SQL_SSL || process.env.DATABASE_SSL || "")
            ? "require"
            : false,
        }),
  },
  verbose: true,
});
