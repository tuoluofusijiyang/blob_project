import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATA_DIR
      ? `${process.env.DATA_DIR}/content-tools.db`
      : './data/content-tools.db',
  },
} satisfies Config;