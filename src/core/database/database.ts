import * as SQLite from 'expo-sqlite';

import { migrateDatabase } from '@/core/database/migrations';

export const DATABASE_NAME = 'inbox-lite.db';

export async function openAppDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrateDatabase(db);
  return db;
}
