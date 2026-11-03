import * as SQLite from 'expo-sqlite'
import { createId } from './id'
import { itemTotals, metalRowNetWeight } from './calc'

// Storage units: money in paise, weight in milligrams, time in epoch ms.
// Integers only, so balances never drift with floating point.
const toPaise = (rs) => Math.round((Number(rs) || 0) * 100)
const toMg = (g) => Math.round((Number(g) || 0) * 1000)
export const fromPaise = (p) => (Number(p) || 0) / 100
export const fromMg = (mg) => (Number(mg) || 0) / 1000

let dbPromise

export function getDb() {
  if (!dbPromise) dbPromise = init()
  return dbPromise
}

async function init() {
  const db = await SQLite.openDatabaseAsync('erp.db')
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS party (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cash       INTEGER NOT NULL DEFAULT 0,
      metal      INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      pct         REAL NOT NULL DEFAULT 100,
      rate        INTEGER,
      rate_mode   TEXT NOT NULL DEFAULT 'weight'
    );

    CREATE TABLE IF NOT EXISTS bill (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no           INTEGER NOT NULL UNIQUE,
      party_id          TEXT NOT NULL REFERENCES party(id),
      bill_ts           INTEGER NOT NULL,
      prev_cash         INTEGER NOT NULL,
      prev_metal        INTEGER NOT NULL,
      total_labour      INTEGER NOT NULL,
      total_weight      INTEGER NOT NULL,
      settlement_type   TEXT NOT NULL CHECK (settlement_type IN ('none','pase','metal')),
      settlement_rate   INTEGER,
      settlement_amount INTEGER NOT NULL,
      received          INTEGER NOT NULL,
      balance           INTEGER NOT NULL,
      bhav_katna        INTEGER NOT NULL DEFAULT 1,
      metal_balance     INTEGER NOT NULL DEFAULT 0,
      status            TEXT NOT NULL DEFAULT 'final',
      created_at        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bill_item (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id            INTEGER NOT NULL REFERENCES bill(id),
      line_no            INTEGER NOT NULL,
      item_name          TEXT NOT NULL,
      qty                INTEGER NOT NULL,
      pct                REAL NOT NULL,
      pack_wt            INTEGER NOT NULL,
      net_wt             INTEGER NOT NULL,
      final_net_wt       INTEGER NOT NULL,
      labour_mode        TEXT,
      labour_rate        INTEGER,
      labour_qty         REAL,
      labour_rate_per_kg INTEGER,
      labour_amount      INTEGER NOT NULL,
      packaging_json     TEXT
    );

    CREATE TABLE IF NOT EXISTS bill_metal_row (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL REFERENCES bill(id),
      wt      INTEGER NOT NULL,
      tunch   REAL NOT NULL,
      net_wt  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger (
      tno           INTEGER PRIMARY KEY AUTOINCREMENT,
      epoch         INTEGER NOT NULL,
      party_id      TEXT NOT NULL REFERENCES party(id),
      bill_no       INTEGER,
      type          TEXT NOT NULL CHECK (type IN ('cash','metal')),
      kind          TEXT NOT NULL,
      amount        INTEGER NOT NULL,
      balance_after INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ledger_party ON ledger(party_id, tno);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_party_name ON party(name COLLATE NOCASE);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_item_name ON item(name COLLATE NOCASE);
  `)

  // Databases created before bhav katna existed lack these two columns. Older
  // metal settlements were always priced (bhav_katna = 1); an unsettled bill
  // still owes all of its metal.
  const cols = await db.getAllAsync('PRAGMA table_info(bill)')
  if (!cols.some((c) => c.name === 'metal_balance')) {
    await db.execAsync(`
      ALTER TABLE bill ADD COLUMN bhav_katna INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE bill ADD COLUMN metal_balance INTEGER NOT NULL DEFAULT 0;
      UPDATE bill SET metal_balance = total_weight WHERE settlement_type = 'none';
    `)
  }

  // Bhav katna can now apply to just part of the metal difference. NULL means
  // the whole difference (every bill saved before this column existed).
  if (!cols.some((c) => c.name === 'bhav_katna_wt')) {
    await db.execAsync('ALTER TABLE bill ADD COLUMN bhav_katna_wt INTEGER;')
  }

  // Parties can be deleted (hidden, not erased, since bills and the ledger refer
  // to them). The name must stay unique only among live parties.
  const partyColsNow = await db.getAllAsync('PRAGMA table_info(party)')
  if (!partyColsNow.some((c) => c.name === 'deleted')) {
    await db.execAsync(`
      ALTER TABLE party ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;
      DROP INDEX IF EXISTS idx_party_name;
      CREATE UNIQUE INDEX idx_party_name ON party(name COLLATE NOCASE) WHERE deleted = 0;
    `)
  }

  // Transactions can be edited or deleted; the original ledger rows are kept
  // but flagged, and a reversal row cancels them out.
  const ledgerCols = await db.getAllAsync('PRAGMA table_info(ledger)')
  if (!ledgerCols.some((c) => c.name === 'voided')) {
    await db.execAsync('ALTER TABLE ledger ADD COLUMN voided INTEGER NOT NULL DEFAULT 0;')
  }
  // voided: 0 live, 1 replaced by an edit, 2 deleted. Rows voided by a delete
  // before the two were told apart (a delete reversal later, with no edit
  // reversal in between) become 2.
  await db.execAsync(`
    UPDATE ledger SET voided = 2
     WHERE voided = 1
       AND EXISTS (SELECT 1 FROM ledger d
                    WHERE d.party_id = ledger.party_id AND d.type = ledger.type
                      AND d.kind = 'txn_delete_reversal' AND d.amount = -ledger.amount AND d.tno > ledger.tno
                      AND NOT EXISTS (SELECT 1 FROM ledger e
                                       WHERE e.party_id = ledger.party_id AND e.type = ledger.type
                                         AND e.kind = 'txn_edit_reversal' AND e.amount = -ledger.amount
                                         AND e.tno > ledger.tno AND e.tno < d.tno));
  `)

  // Links every version of a Transaction In/Out (original, reversal, edited
  // copy) so its edit log can be read back. NULL on older rows: such a row is
  // its own chain, identified by the first row of its group.
  if (!ledgerCols.some((c) => c.name === 'chain')) {
    await db.execAsync('ALTER TABLE ledger ADD COLUMN chain INTEGER;')
  }

  // Party/item descriptions and item defaults arrived later than the tables.
  const partyCols = await db.getAllAsync('PRAGMA table_info(party)')
  if (!partyCols.some((c) => c.name === 'description')) {
    await db.execAsync("ALTER TABLE party ADD COLUMN description TEXT NOT NULL DEFAULT ''")
  }
  const itemCols = await db.getAllAsync('PRAGMA table_info(item)')
  if (!itemCols.some((c) => c.name === 'pct')) {
    await db.execAsync(`
      ALTER TABLE item ADD COLUMN description TEXT NOT NULL DEFAULT '';
      ALTER TABLE item ADD COLUMN pct REAL NOT NULL DEFAULT 100;
      ALTER TABLE item ADD COLUMN rate INTEGER;
      ALTER TABLE item ADD COLUMN rate_mode TEXT NOT NULL DEFAULT 'weight';
    `)
  }

  return db
}

export async function getParties() {
  const db = await getDb()
  return db.getAllAsync('SELECT id, name FROM party WHERE deleted = 0 ORDER BY name COLLATE NOCASE')
}

// Creates the party, or returns the existing one if the name is already taken
// (case-insensitive). New parties start with a zero balance.
export async function createParty(name) {
  const db = await getDb()
  const clean = String(name || '').trim()
  if (!clean) throw new Error('Name is required')
  const existing = await db.getFirstAsync('SELECT id, name FROM party WHERE name = ? COLLATE NOCASE AND deleted = 0', clean)
  if (existing) return existing
  const id = createId('party')
  await db.runAsync('INSERT INTO party (id, name, cash, metal, created_at) VALUES (?, ?, 0, 0, ?)', id, clean, Date.now())
  return { id, name: clean }
}

// Full "Add Party" form. Unlike createParty, a taken name is an error. Opening
// cash/metal balances go on the ledger so the books reconcile from the start.
export async function addParty({ name, description, cash, metal }) {
  const db = await getDb()
  const clean = String(name || '').trim()
  if (!clean) throw new Error('Name is required')
  let party
  await db.withTransactionAsync(async () => {
    const dup = await db.getFirstAsync('SELECT id FROM party WHERE name = ? COLLATE NOCASE AND deleted = 0', clean)
    if (dup) throw new Error('A party with this name already exists')
    const id = createId('party')
    const now = Date.now()
    const c = toPaise(cash)
    const m = toMg(metal)
    await db.runAsync(
      'INSERT INTO party (id, name, description, cash, metal, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      id,
      clean,
      String(description || '').trim(),
      c,
      m,
      now
    )
    for (const [type, amount] of [['cash', c], ['metal', m]]) {
      if (amount === 0) continue
      await db.runAsync(
        "INSERT INTO ledger (epoch, party_id, bill_no, type, kind, amount, balance_after) VALUES (?, ?, NULL, ?, 'opening', ?, ?)",
        now,
        id,
        type,
        amount,
        amount
      )
    }
    party = { id, name: clean }
  })
  return party
}

// Full "Add Item" form. pct and rate prefill a sale line when the item is picked.
export async function addItem({ name, description, pct, rate, rateMode }) {
  const db = await getDb()
  const clean = String(name || '').trim()
  if (!clean) throw new Error('Name is required')
  const dup = await db.getFirstAsync('SELECT id FROM item WHERE name = ? COLLATE NOCASE', clean)
  if (dup) throw new Error('An item with this name already exists')
  const id = createId('item')
  const hasRate = rate !== '' && rate != null
  await db.runAsync(
    'INSERT INTO item (id, name, description, pct, rate, rate_mode) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    clean,
    String(description || '').trim(),
    pct === '' || pct == null ? 100 : Number(pct),
    hasRate ? toPaise(rate) : null,
    rateMode === 'piece' ? 'piece' : 'weight'
  )
  return { id, name: clean }
}

// ---- Alter Party / Alter Items ----------------------------------------------

// Every live party with its current balances (for the Alter Party list).
export async function listParties() {
  const db = await getDb()
  const rows = await db.getAllAsync(
    'SELECT id, name, description, cash, metal FROM party WHERE deleted = 0 ORDER BY name COLLATE NOCASE'
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    cash: fromPaise(r.cash),
    metal: fromMg(r.metal),
  }))
}

// One party for viewing/editing: its opening balances, current balances and
// how many live sales / transactions it has (a party with any can't be deleted).
export async function getParty(id) {
  const db = await getDb()
  const p = await db.getFirstAsync('SELECT * FROM party WHERE id = ? AND deleted = 0', id)
  if (!p) throw new Error('Party not found')
  const opening = await db.getAllAsync(
    "SELECT type, SUM(amount) AS amount FROM ledger WHERE party_id = ? AND kind = 'opening' AND bill_no IS NULL GROUP BY type",
    id
  )
  const open = (type) => opening.find((o) => o.type === type)?.amount || 0
  const bills = await db.getFirstAsync("SELECT COUNT(*) AS n FROM bill WHERE party_id = ? AND status != 'deleted'", id)
  const txns = await db.getFirstAsync(
    "SELECT COUNT(*) AS n FROM (SELECT DISTINCT epoch, kind FROM ledger WHERE party_id = ? AND kind IN ('txn_in', 'txn_out') AND voided = 0)",
    id
  )
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    cash: fromPaise(p.cash),
    metal: fromMg(p.metal),
    openingCash: fromPaise(open('cash')),
    openingMetal: fromMg(open('metal')),
    bills: bills.n,
    txns: txns.n,
  }
}

// Edits name, description and the opening cash/metal. A changed opening balance
// moves the party's current balance by the same amount; the opening ledger row
// (and the running balances after it) are adjusted to match.
export async function updateParty(id, { name, description, openingCash, openingMetal }) {
  const db = await getDb()
  const clean = String(name || '').trim()
  if (!clean) throw new Error('Name is required')
  await db.withTransactionAsync(async () => {
    const p = await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ? AND deleted = 0', id)
    if (!p) throw new Error('Party not found')
    const dup = await db.getFirstAsync(
      'SELECT id FROM party WHERE name = ? COLLATE NOCASE AND deleted = 0 AND id != ?',
      clean,
      id
    )
    if (dup) throw new Error('A party with this name already exists')

    const balances = { cash: p.cash, metal: p.metal }
    const wanted = { cash: toPaise(openingCash), metal: toMg(openingMetal) }
    for (const type of ['cash', 'metal']) {
      const row = await db.getFirstAsync(
        "SELECT tno, amount FROM ledger WHERE party_id = ? AND type = ? AND kind = 'opening' AND bill_no IS NULL",
        id,
        type
      )
      const old = row ? row.amount : 0
      const delta = wanted[type] - old
      if (delta === 0) continue
      balances[type] += delta
      if (row && wanted[type] === 0) {
        await db.runAsync('DELETE FROM ledger WHERE tno = ?', row.tno)
        await db.runAsync(
          'UPDATE ledger SET balance_after = balance_after + ? WHERE party_id = ? AND type = ? AND tno > ?',
          delta,
          id,
          type,
          row.tno
        )
      } else if (row) {
        await db.runAsync('UPDATE ledger SET amount = ? WHERE tno = ?', wanted[type], row.tno)
        await db.runAsync(
          'UPDATE ledger SET balance_after = balance_after + ? WHERE party_id = ? AND type = ? AND tno >= ?',
          delta,
          id,
          type,
          row.tno
        )
      } else {
        await db.runAsync(
          "INSERT INTO ledger (epoch, party_id, bill_no, type, kind, amount, balance_after) VALUES (?, ?, NULL, ?, 'opening', ?, ?)",
          Date.now(),
          id,
          type,
          delta,
          balances[type]
        )
      }
    }
    await db.runAsync(
      'UPDATE party SET name = ?, description = ?, cash = ?, metal = ? WHERE id = ?',
      clean,
      String(description || '').trim(),
      balances.cash,
      balances.metal,
      id
    )
  })
}

// Hides the party. Refused while it still has live sales or transactions: those
// have to be deleted first, so no bill is left pointing at a missing party.
export async function deleteParty(id) {
  const info = await getParty(id)
  if (info.bills || info.txns) {
    const parts = []
    if (info.bills) parts.push(`${info.bills} sale${info.bills > 1 ? 's' : ''}`)
    if (info.txns) parts.push(`${info.txns} transaction${info.txns > 1 ? 's' : ''}`)
    throw new Error(`This party still has ${parts.join(' and ')}. Delete ${parts.length > 1 ? 'those' : 'it'} first.`)
  }
  const db = await getDb()
  await db.runAsync('UPDATE party SET deleted = 1 WHERE id = ?', id)
}

export async function updateItem(id, { name, description, pct, rate, rateMode }) {
  const db = await getDb()
  const clean = String(name || '').trim()
  if (!clean) throw new Error('Name is required')
  const dup = await db.getFirstAsync('SELECT id FROM item WHERE name = ? COLLATE NOCASE AND id != ?', clean, id)
  if (dup) throw new Error('An item with this name already exists')
  const hasRate = rate !== '' && rate != null
  const res = await db.runAsync(
    'UPDATE item SET name = ?, description = ?, pct = ?, rate = ?, rate_mode = ? WHERE id = ?',
    clean,
    String(description || '').trim(),
    pct === '' || pct == null ? 100 : Number(pct),
    hasRate ? toPaise(rate) : null,
    rateMode === 'piece' ? 'piece' : 'weight',
    id
  )
  if (!res.changes) throw new Error('Item not found')
}

// Sales keep the item name they were billed with, so deleting an item never
// changes an existing bill.
export async function deleteItem(id) {
  const db = await getDb()
  await db.runAsync('DELETE FROM item WHERE id = ?', id)
}

export async function createItem(name) {
  const db = await getDb()
  const clean = String(name || '').trim()
  if (!clean) throw new Error('Name is required')
  const existing = await db.getFirstAsync('SELECT id, name FROM item WHERE name = ? COLLATE NOCASE', clean)
  if (existing) return existing
  const id = createId('item')
  await db.runAsync('INSERT INTO item (id, name) VALUES (?, ?)', id, clean)
  return { id, name: clean }
}

// Items carry defaults (percentage and labour rate) that prefill a sale line.
export async function getItems() {
  const db = await getDb()
  const rows = await db.getAllAsync(
    'SELECT id, name, description, pct, rate, rate_mode FROM item ORDER BY name COLLATE NOCASE'
  )
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    pct: r.pct,
    rate: r.rate == null ? null : fromPaise(r.rate),
    rateMode: r.rate_mode,
  }))
}

// Newest first. Amounts are returned in rupees, not paise.
export async function getBills() {
  const db = await getDb()
  const rows = await db.getAllAsync(
    `SELECT b.bill_no, b.bill_ts, b.settlement_amount, b.received, b.balance, b.metal_balance, p.name AS party_name
       FROM bill b JOIN party p ON p.id = b.party_id
      WHERE b.status != 'deleted'
      ORDER BY b.bill_ts DESC, b.bill_no DESC`
  )
  return rows.map((r) => ({
    billNo: r.bill_no,
    billTs: r.bill_ts,
    partyName: r.party_name,
    amount: fromPaise(r.settlement_amount),
    received: fromPaise(r.received),
    balance: fromPaise(r.balance),
    // Metal still owed (grams, signed: negative = we owe the customer).
    metalDue: fromMg(r.metal_balance),
  }))
}

export async function getNextBillNo() {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT COALESCE(MAX(bill_no), 0) + 1 AS n FROM bill')
  return row.n
}

export async function getPartyDues(partyId) {
  const db = await getDb()
  const row = await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ?', partyId)
  return { rs: fromPaise(row?.cash), metal: fromMg(row?.metal) }
}

// Cash and/or metal moving without a sale. 'in': the party pays or hands over,
// so what they owe falls. 'out': the shop pays or hands over, so what they owe
// rises. One ledger row per non-zero amount, with no bill number.
function checkTxnAmounts(cash, metal) {
  const cashP = toPaise(cash)
  const metalMg = toMg(metal)
  if (cashP < 0 || metalMg < 0) throw new Error('Amounts cannot be negative')
  if (cashP === 0 && metalMg === 0) throw new Error('Enter a cash or metal amount')
  return { cashP, metalMg }
}

// chain: the id linking this transaction's versions; null for a brand new one,
// in which case the first row written becomes the chain id.
async function writeTxnRows(db, partyId, direction, cashP, metalMg, now, chain = null) {
  const sign = direction === 'in' ? -1 : 1
  const kind = direction === 'in' ? 'txn_in' : 'txn_out'
  const party = await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ?', partyId)
  if (!party) throw new Error('Party not found')
  let newCash = party.cash
  let newMetal = party.metal
  const written = []
  const add = async (type, amount, balanceAfter) => {
    const r = await db.runAsync(
      'INSERT INTO ledger (epoch, party_id, bill_no, type, kind, amount, balance_after, chain) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
      now,
      partyId,
      type,
      kind,
      amount,
      balanceAfter,
      chain
    )
    written.push(r.lastInsertRowId)
  }
  if (cashP) {
    newCash += sign * cashP
    await add('cash', sign * cashP, newCash)
  }
  if (metalMg) {
    newMetal += sign * metalMg
    await add('metal', sign * metalMg, newMetal)
  }
  if (chain == null) {
    await db.runAsync(`UPDATE ledger SET chain = ? WHERE tno IN (${written.map(() => '?').join(',')})`, written[0], ...written)
  }
  await db.runAsync('UPDATE party SET cash = ?, metal = ? WHERE id = ?', newCash, newMetal, partyId)
}

export async function addTransaction({ partyId, direction, cash, metal }) {
  if (direction !== 'in' && direction !== 'out') throw new Error('Invalid transaction type')
  const { cashP, metalMg } = checkTxnAmounts(cash, metal)
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    await writeTxnRows(db, partyId, direction, cashP, metalMg, Date.now())
  })
}

// The ledger rows of one Transaction In/Out (cash and metal are written together).
async function txnRows(db, tno) {
  const row = await db.getFirstAsync(
    "SELECT * FROM ledger WHERE tno = ? AND bill_no IS NULL AND kind IN ('txn_in', 'txn_out')",
    tno
  )
  if (!row) throw new Error('Transaction not found')
  return db.getAllAsync(
    'SELECT * FROM ledger WHERE party_id = ? AND epoch = ? AND kind = ? AND bill_no IS NULL ORDER BY tno',
    row.party_id,
    row.epoch,
    row.kind
  )
}

export async function getTransaction(tno) {
  const db = await getDb()
  const rows = await txnRows(db, tno)
  const cashRow = rows.find((r) => r.type === 'cash')
  const metalRow = rows.find((r) => r.type === 'metal')
  const party = await db.getFirstAsync('SELECT id, name FROM party WHERE id = ?', rows[0].party_id)
  return {
    id: tno,
    direction: rows[0].kind === 'txn_in' ? 'in' : 'out',
    party,
    ts: rows[0].epoch,
    voided: rows.some((r) => r.voided !== 0),
    cash: cashRow ? Math.abs(fromPaise(cashRow.amount)) : 0,
    metal: metalRow ? Math.abs(fromMg(metalRow.amount)) : 0,
  }
}

// Cancels the transaction's rows with reversal rows and restores the party's
// balances. The original rows stay as history, flagged as voided.
async function voidTxnRows(db, rows, reversalKind, now, chain) {
  if (rows.some((r) => r.voided !== 0)) throw new Error('This transaction was already edited or deleted')
  const partyId = rows[0].party_id
  const party = await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ?', partyId)
  let cash = party.cash
  let metal = party.metal
  for (const r of rows) {
    if (r.type === 'cash') cash -= r.amount
    else metal -= r.amount
    await db.runAsync(
      'INSERT INTO ledger (epoch, party_id, bill_no, type, kind, amount, balance_after, chain) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)',
      now,
      partyId,
      r.type,
      reversalKind,
      -r.amount,
      r.type === 'cash' ? cash : metal,
      chain
    )
    await db.runAsync(
      'UPDATE ledger SET voided = ?, chain = ? WHERE tno = ?',
      reversalKind === 'txn_delete_reversal' ? 2 : 1,
      chain,
      r.tno
    )
  }
  await db.runAsync('UPDATE party SET cash = ?, metal = ? WHERE id = ?', cash, metal, partyId)
}

export async function updateTransaction(tno, { cash, metal }) {
  const { cashP, metalMg } = checkTxnAmounts(cash, metal)
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    const rows = await txnRows(db, tno)
    const chain = rows[0].chain ?? rows[0].tno
    const now = Date.now()
    await voidTxnRows(db, rows, 'txn_edit_reversal', now, chain)
    await writeTxnRows(db, rows[0].party_id, rows[0].kind === 'txn_in' ? 'in' : 'out', cashP, metalMg, now, chain)
  })
}

export async function deleteTransaction(tno) {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    const rows = await txnRows(db, tno)
    await voidTxnRows(db, rows, 'txn_delete_reversal', Date.now(), rows[0].chain ?? rows[0].tno)
  })
}

// Everything to print on a detailed statement, oldest first: each live sale
// (by bill date, with its full bill) and each live Transaction In/Out and
// opening balance, with the party's cash and metal balances just before and
// after it. Optionally for one party and a from/to range (epoch ms).
export async function getStatement({ partyId, from, to } = {}) {
  const db = await getDb()
  const items = []

  const where = ["status != 'deleted'"]
  const args = []
  if (partyId) {
    where.push('party_id = ?')
    args.push(partyId)
  }
  if (from != null) {
    where.push('bill_ts >= ?')
    args.push(from)
  }
  if (to != null) {
    where.push('bill_ts <= ?')
    args.push(to)
  }
  const bills = await db.getAllAsync(`SELECT bill_no, bill_ts FROM bill WHERE ${where.join(' AND ')}`, ...args)
  for (const b of bills) items.push({ kind: 'sale', ts: b.bill_ts, bill: await getBill(b.bill_no) })

  const balanceAt = async (pid, type, tno, inclusive) => {
    const r = await db.getFirstAsync(
      `SELECT balance_after FROM ledger WHERE party_id = ? AND type = ? AND tno ${inclusive ? '<=' : '<'} ? ORDER BY tno DESC LIMIT 1`,
      pid,
      type,
      tno
    )
    return r ? r.balance_after : 0
  }
  for (const e of await getTransactions({ partyId, from, to })) {
    if (e.voided || !['txn_in', 'txn_out', 'opening'].includes(e.kind)) continue
    const rows = await db.getAllAsync(
      'SELECT tno FROM ledger WHERE party_id = ? AND epoch = ? AND kind = ? AND bill_no IS NULL ORDER BY tno',
      e.partyId,
      e.ts,
      e.kind
    )
    const first = rows[0].tno
    const last = rows[rows.length - 1].tno
    items.push({
      kind: e.kind,
      ts: e.ts,
      partyName: e.partyName,
      cash: e.cash,
      metal: e.metal,
      cashBefore: fromPaise(await balanceAt(e.partyId, 'cash', first, false)),
      cashAfter: fromPaise(await balanceAt(e.partyId, 'cash', last, true)),
      metalBefore: fromMg(await balanceAt(e.partyId, 'metal', first, false)),
      metalAfter: fromMg(await balanceAt(e.partyId, 'metal', last, true)),
    })
  }
  return items.sort((a, b) => a.ts - b.ts)
}

// What is owed right now: one party's cash and metal, or every party's added up.
// Positive = the party owes the shop, negative = the shop owes the party.
export async function getBalances({ partyId } = {}) {
  const db = await getDb()
  const row = partyId
    ? await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ?', partyId)
    : await db.getFirstAsync('SELECT COALESCE(SUM(cash), 0) AS cash, COALESCE(SUM(metal), 0) AS metal FROM party WHERE deleted = 0')
  return { cash: fromPaise(row?.cash), metal: fromMg(row?.metal) }
}

// Every ledger movement, latest first, optionally for one party, a name
// search and a from/to range (epoch ms). Rows written together (cash and metal
// of the same event) are merged into one entry.
export async function getTransactions({ partyId, query, from, to } = {}) {
  const db = await getDb()
  // Only the current version of each entry is listed: deleted sales and
  // transactions, edit/reversal rows and superseded versions are left out (an
  // entry's edit log shows them). A sale is dated by its bill date.
  const BILL_KINDS = "('bill', 'received', 'edit_bill', 'edit_received')"
  const where = [
    'l.voided = 0',
    "l.kind NOT IN ('edit_reversal', 'txn_edit_reversal', 'txn_delete_reversal', 'delete_reversal')",
    "(b.status IS NULL OR b.status != 'deleted')",
    'p.deleted = 0',
    `NOT (l.kind IN ${BILL_KINDS} AND l.epoch < COALESCE((SELECT MAX(r.epoch) FROM ledger r WHERE r.bill_no = l.bill_no AND r.kind = 'edit_reversal'), 0))`,
  ]
  const args = []
  if (partyId) {
    where.push('l.party_id = ?')
    args.push(partyId)
  }
  const q = String(query || '').trim()
  if (q) {
    where.push("p.name LIKE ? ESCAPE '\\'")
    args.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`)
  }
  if (from != null) {
    where.push('COALESCE(b.bill_ts, l.epoch) >= ?')
    args.push(from)
  }
  if (to != null) {
    where.push('COALESCE(b.bill_ts, l.epoch) <= ?')
    args.push(to)
  }
  const rows = await db.getAllAsync(
    `SELECT l.tno, l.epoch, COALESCE(b.bill_ts, l.epoch) AS when_ts, l.party_id, p.name AS party_name,
            l.bill_no, l.type, l.kind, l.amount, l.balance_after
       FROM ledger l JOIN party p ON p.id = l.party_id
       LEFT JOIN bill b ON b.bill_no = l.bill_no
      WHERE ${where.join(' AND ')}
      ORDER BY l.tno DESC`,
    ...args
  )

  // An entry is the cash and metal rows written together; an edited sale's
  // current rows count as plain 'bill' / 'received'.
  const entries = new Map()
  for (const r of rows) {
    const kind = r.kind === 'edit_bill' ? 'bill' : r.kind === 'edit_received' ? 'received' : r.kind
    const key = `${r.epoch}|${r.party_id}|${kind}|${r.bill_no}`
    let entry = entries.get(key)
    if (!entry) {
      entry = { id: r.tno, ts: r.when_ts, partyId: r.party_id, partyName: r.party_name, kind, billNo: r.bill_no, billDeleted: false, voided: false, cash: null, metal: null, cashAfter: null, metalAfter: null }
      entries.set(key, entry)
    }
    if (r.type === 'cash') {
      entry.cash = fromPaise(r.amount)
      entry.cashAfter = fromPaise(r.balance_after)
    } else {
      entry.metal = fromMg(r.amount)
      entry.metalAfter = fromMg(r.balance_after)
    }
  }
  // Latest first (insertion order is already newest row first within a date).
  return [...entries.values()].sort((a, b) => b.ts - a.ts || b.id - a.id)
}

// ---- Edit logs (shown at the bottom of an opened sale / transaction, never printed) ----

// What happened to a sale: when it was created and each later edit.
export async function getBillLog(billNo) {
  const db = await getDb()
  const bill = await db.getFirstAsync('SELECT created_at FROM bill WHERE bill_no = ?', billNo)
  if (!bill) throw new Error('Bill not found')
  const rows = await db.getAllAsync('SELECT * FROM ledger WHERE bill_no = ? ORDER BY tno', billNo)
  const byEpoch = new Map()
  for (const r of rows) {
    if (!byEpoch.has(r.epoch)) byEpoch.set(r.epoch, [])
    byEpoch.get(r.epoch).push(r)
  }
  const sum = (list, kinds, type) =>
    list.filter((r) => kinds.includes(r.kind) && r.type === type).reduce((t, r) => t + r.amount, 0)
  const log = [{ ts: bill.created_at, kind: 'created' }]
  for (const [ts, list] of byEpoch) {
    if (!list.some((r) => r.kind === 'edit_reversal')) {
      // The original entry: what the sale first did to the party's balance.
      Object.assign(log[0], {
        cash: fromPaise(sum(list, ['bill'], 'cash')),
        received: fromPaise(-sum(list, ['received'], 'cash')),
        metal: fromMg(sum(list, ['bill'], 'metal')),
      })
      continue
    }
    log.push({
      ts,
      kind: 'edited',
      // The net the previous version had, which the reversal cancels out.
      previous: { cash: fromPaise(-sum(list, ['edit_reversal'], 'cash')), metal: fromMg(-sum(list, ['edit_reversal'], 'metal')) },
      cash: fromPaise(sum(list, ['edit_bill'], 'cash')),
      received: fromPaise(-sum(list, ['edit_received'], 'cash')),
      metal: fromMg(sum(list, ['edit_bill'], 'metal')),
    })
  }
  return log.sort((a, b) => a.ts - b.ts)
}

// What happened to a Transaction In/Out: created, then each edit.
export async function getTransactionLog(tno) {
  const db = await getDb()
  const rows = await txnRows(db, tno)
  const chain = rows[0].chain ?? rows[0].tno
  const all = await db.getAllAsync(
    'SELECT * FROM ledger WHERE chain = ? OR (chain IS NULL AND tno IN (' + rows.map(() => '?').join(',') + ')) ORDER BY tno',
    chain,
    ...rows.map((r) => r.tno)
  )
  const byEpoch = new Map()
  for (const r of all) {
    if (!byEpoch.has(r.epoch)) byEpoch.set(r.epoch, [])
    byEpoch.get(r.epoch).push(r)
  }
  const amount = (list, kinds, type) =>
    Math.abs(list.filter((r) => kinds.includes(r.kind) && r.type === type).reduce((t, r) => t + r.amount, 0))
  const log = []
  for (const [ts, list] of byEpoch) {
    const live = ['txn_in', 'txn_out']
    const edited = list.some((r) => r.kind === 'txn_edit_reversal')
    log.push({
      ts,
      kind: edited ? 'edited' : 'created',
      previous: edited
        ? { cash: fromPaise(amount(list, ['txn_edit_reversal'], 'cash')), metal: fromMg(amount(list, ['txn_edit_reversal'], 'metal')) }
        : null,
      cash: fromPaise(amount(list, live, 'cash')),
      metal: fromMg(amount(list, live, 'metal')),
    })
  }
  return log.sort((a, b) => a.ts - b.ts)
}

// Inserts the bill's lines and, for a metal settlement, its metal rows.
async function writeBillBody(db, billId, items, settlement) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const t = itemTotals(it)
    const l = it.labour
    await db.runAsync(
      `INSERT INTO bill_item (bill_id, line_no, item_name, qty, pct, pack_wt, net_wt, final_net_wt,
         labour_mode, labour_rate, labour_qty, labour_rate_per_kg, labour_amount, packaging_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      billId,
      i + 1,
      it.name,
      toMg(it.qty),
      Number(it.pct) || 0,
      toMg(t.packWt),
      toMg(t.netWt),
      toMg(t.finalNetWt),
      l ? l.mode : null,
      l && l.mode === 'piece' ? toPaise(l.rate) : null,
      l && l.mode === 'piece' ? Number(l.qty) || 0 : null,
      l && l.mode === 'weight' ? toPaise(l.ratePerKg) : null,
      toPaise(t.labour),
      JSON.stringify((it.packaging || []).map(({ wtG, qnt }) => ({ wtG, qnt })))
    )
  }

  if (settlement && settlement.mode === 'metal') {
    for (const r of settlement.rows || []) {
      const wt = Number(r.wt) || 0
      const tunch = Number(r.tunch) || 0
      await db.runAsync(
        'INSERT INTO bill_metal_row (bill_id, wt, tunch, net_wt) VALUES (?, ?, ?, ?)',
        billId,
        toMg(wt),
        tunch,
        toMg(metalRowNetWeight(r))
      )
    }
  }
}

// What a bill does to the books, from its form values.
const isPricedSettlement = (settlement) => !(settlement && settlement.mode === 'metal' && settlement.bhavKatna === false)

// Typed bhav katna weight in mg, or null when the whole difference is priced.
const katnaWtMg = (settlement) =>
  settlement && settlement.mode === 'metal' && settlement.bhavKatna && settlement.katnaWt != null
    ? toMg(settlement.katnaWt)
    : null

function billEffects({ totals, settlement, received }) {
  const cashDue = settlement ? toPaise(settlement.amount) : toPaise(totals.rs)
  // Metal still owed (signed): everything if no settlement; the unpriced
  // difference for a Metal settlement without bhav katna; otherwise none.
  const metalDue = !settlement ? toMg(totals.wt) : settlement.mode === 'metal' ? toMg(settlement.metalBalance) : 0
  const receivedP = toPaise(received)
  return { cashDue, metalDue, receivedP, balance: cashDue - receivedP }
}

// Ledger rows for a bill. Cash: a debit row for what the bill comes to and a
// separate credit row for what was received; only the remainder moves the
// party's cash balance. Metal: one row for whatever metal is still owed - all
// of it with no settlement, the unpriced remainder of a Metal settlement, and
// nothing after Pase.
// Updates the party row and returns nothing.
async function writeLedger(db, partyId, billNo, fx, now, kinds = { bill: 'bill', received: 'received' }) {
  const party = await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ?', partyId)
  let cash = party.cash
  let metal = party.metal
  const add = (type, kind, amount, balanceAfter) =>
    db.runAsync(
      'INSERT INTO ledger (epoch, party_id, bill_no, type, kind, amount, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?)',
      now,
      partyId,
      billNo,
      type,
      kind,
      amount,
      balanceAfter
    )

  if (fx.cashDue !== 0) {
    cash += fx.cashDue
    await add('cash', kinds.bill, fx.cashDue, cash)
  }
  if (fx.receivedP !== 0) {
    cash -= fx.receivedP
    await add('cash', kinds.received, -fx.receivedP, cash)
  }
  if (fx.metalDue !== 0) {
    metal += fx.metalDue
    await add('metal', kinds.bill, fx.metalDue, metal)
  }
  await db.runAsync('UPDATE party SET cash = ?, metal = ? WHERE id = ?', cash, metal, partyId)
}

export async function saveBill({ partyId, billTs, items, totals, settlement, received }) {
  const db = await getDb()
  let billNo

  await db.withTransactionAsync(async () => {
    const party = await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ?', partyId)
    if (!party) throw new Error('Party not found')

    const next = await db.getFirstAsync('SELECT COALESCE(MAX(bill_no), 0) + 1 AS n FROM bill')
    billNo = next.n
    const now = Date.now()
    const fx = billEffects({ totals, settlement, received })

    const bill = await db.runAsync(
      `INSERT INTO bill (bill_no, party_id, bill_ts, prev_cash, prev_metal, total_labour, total_weight,
         settlement_type, settlement_rate, settlement_amount, received, balance, bhav_katna, metal_balance,
         bhav_katna_wt, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'final', ?)`,
      billNo,
      partyId,
      billTs,
      party.cash,
      party.metal,
      toPaise(totals.rs),
      toMg(totals.wt),
      settlement ? settlement.mode : 'none',
      settlement ? toPaise(settlement.rate) : null,
      fx.cashDue,
      fx.receivedP,
      fx.balance,
      isPricedSettlement(settlement) ? 1 : 0,
      fx.metalDue,
      katnaWtMg(settlement),
      now
    )

    await writeBillBody(db, bill.lastInsertRowId, items, settlement)
    await writeLedger(db, partyId, billNo, fx, now)
  })

  return billNo
}

// Full bill in the shape the sale form works with (rupees and grams).
export async function getBill(billNo) {
  const db = await getDb()
  const b = await db.getFirstAsync(
    `SELECT b.*, p.name AS party_name FROM bill b JOIN party p ON p.id = b.party_id WHERE b.bill_no = ?`,
    billNo
  )
  if (!b || b.status === 'deleted') throw new Error('Bill not found')

  const rows = await db.getAllAsync('SELECT * FROM bill_item WHERE bill_id = ? ORDER BY line_no', b.id)
  const items = rows.map((r) => ({
    id: createId('item'),
    name: r.item_name,
    qty: fromMg(r.qty),
    pct: r.pct,
    packaging: JSON.parse(r.packaging_json || '[]').map((p) => ({ id: createId('pkgrow'), ...p })),
    labour:
      r.labour_mode === 'piece'
        ? { mode: 'piece', rate: fromPaise(r.labour_rate), qty: r.labour_qty, ratePerKg: '' }
        : r.labour_mode === 'weight'
          ? { mode: 'weight', rate: '', qty: '', ratePerKg: fromPaise(r.labour_rate_per_kg) }
          : null,
  }))

  let settlement = null
  if (b.settlement_type === 'pase') {
    settlement = { mode: 'pase', rate: fromPaise(b.settlement_rate), amount: fromPaise(b.settlement_amount) }
  } else if (b.settlement_type === 'metal') {
    const metalRows = await db.getAllAsync('SELECT * FROM bill_metal_row WHERE bill_id = ? ORDER BY id', b.id)
    settlement = {
      mode: 'metal',
      rate: fromPaise(b.settlement_rate),
      amount: fromPaise(b.settlement_amount),
      bhavKatna: b.bhav_katna === 1,
      katnaWt: b.bhav_katna_wt == null ? undefined : fromMg(b.bhav_katna_wt),
      metalBalance: fromMg(b.metal_balance),
      rows: metalRows.map((m) => ({ id: createId('metalrow'), wt: fromMg(m.wt), tunch: m.tunch })),
    }
  }

  return {
    billNo: b.bill_no,
    partyId: b.party_id,
    partyName: b.party_name,
    billTs: b.bill_ts,
    prevDues: { rs: fromPaise(b.prev_cash), metal: fromMg(b.prev_metal) },
    received: fromPaise(b.received),
    settlement,
    items,
  }
}

// Cancels a bill's net effect on each ledger with a reversal row, keeping the
// original rows as history, and restores the party's balances.
async function reverseLedger(db, billNo, partyId, now, kind) {
  for (const type of ['cash', 'metal']) {
    const sum = await db.getFirstAsync(
      'SELECT COALESCE(SUM(amount), 0) AS s FROM ledger WHERE bill_no = ? AND type = ?',
      billNo,
      type
    )
    if (sum.s === 0) continue
    const party = await db.getFirstAsync('SELECT cash, metal FROM party WHERE id = ?', partyId)
    const after = (type === 'cash' ? party.cash : party.metal) - sum.s
    await db.runAsync(
      'INSERT INTO ledger (epoch, party_id, bill_no, type, kind, amount, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?)',
      now,
      partyId,
      billNo,
      type,
      kind,
      -sum.s,
      after
    )
    await db.runAsync(`UPDATE party SET ${type} = ? WHERE id = ?`, after, partyId)
  }
}

// Edits a bill in place (same bill number, same party). History is kept:
// the old bill's ledger rows stay, a reversal row cancels their net effect
// on each ledger, and the new figures are written as fresh rows.
export async function updateBill(billNo, { billTs, items, totals, settlement, received }) {
  const db = await getDb()

  await db.withTransactionAsync(async () => {
    const b = await db.getFirstAsync('SELECT id, party_id, status FROM bill WHERE bill_no = ?', billNo)
    if (!b || b.status === 'deleted') throw new Error('Bill not found')
    const now = Date.now()

    await reverseLedger(db, billNo, b.party_id, now, 'edit_reversal')

    const fx = billEffects({ totals, settlement, received })
    await db.runAsync(
      `UPDATE bill SET bill_ts = ?, total_labour = ?, total_weight = ?, settlement_type = ?, settlement_rate = ?,
         settlement_amount = ?, received = ?, balance = ?, bhav_katna = ?, metal_balance = ?,
         bhav_katna_wt = ? WHERE id = ?`,
      billTs,
      toPaise(totals.rs),
      toMg(totals.wt),
      settlement ? settlement.mode : 'none',
      settlement ? toPaise(settlement.rate) : null,
      fx.cashDue,
      fx.receivedP,
      fx.balance,
      isPricedSettlement(settlement) ? 1 : 0,
      fx.metalDue,
      katnaWtMg(settlement),
      b.id
    )
    await db.runAsync('DELETE FROM bill_item WHERE bill_id = ?', b.id)
    await db.runAsync('DELETE FROM bill_metal_row WHERE bill_id = ?', b.id)
    await writeBillBody(db, b.id, items, settlement)
    await writeLedger(db, b.party_id, billNo, fx, now, { bill: 'edit_bill', received: 'edit_received' })
  })
}

// Deletes a bill. The bill and its ledger rows stay as history (status
// 'deleted'); a reversal row cancels the effect on the party's balances.
// The bill number is not reused.
export async function deleteBill(billNo) {
  const db = await getDb()
  await db.withTransactionAsync(async () => {
    const b = await db.getFirstAsync('SELECT id, party_id, status FROM bill WHERE bill_no = ?', billNo)
    if (!b || b.status === 'deleted') throw new Error('Bill not found')
    await reverseLedger(db, billNo, b.party_id, Date.now(), 'delete_reversal')
    await db.runAsync("UPDATE bill SET status = 'deleted' WHERE id = ?", b.id)
  })
}
