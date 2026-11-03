// Node-side stand-in for expo-sqlite's async API, backed by node:sqlite.
// Lets server/db.js stay identical to the mobile app's src/db.js.
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'

export async function openDatabaseAsync(name) {
  const dir = path.join(process.cwd(), 'data')
  fs.mkdirSync(dir, { recursive: true })
  const d = new DatabaseSync(path.join(dir, name))

  // One transaction at a time: requests can interleave at every await.
  let queue = Promise.resolve()

  return {
    execAsync: async (sql) => d.exec(sql),
    runAsync: async (sql, ...p) => {
      const r = d.prepare(sql).run(...p)
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes }
    },
    getFirstAsync: async (sql, ...p) => d.prepare(sql).get(...p) ?? null,
    getAllAsync: async (sql, ...p) => d.prepare(sql).all(...p),
    withTransactionAsync: (fn) => {
      const run = queue.then(async () => {
        d.exec('BEGIN')
        try {
          await fn()
          d.exec('COMMIT')
        } catch (e) {
          d.exec('ROLLBACK')
          throw e
        }
      })
      queue = run.catch(() => {})
      return run
    },
  }
}
