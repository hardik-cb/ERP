// Dev-server API so the web app can save to and read from data/erp.db.
// Only runs under `vite` (dev/preview); a static build has no backend.
import { getBillLog, getTransactionLog, addItem, addParty, deleteItem, deleteParty, getParty, listParties, updateItem, updateParty, addTransaction, deleteTransaction, getBalances, getStatement, getTransaction, getTransactions, updateTransaction, createItem, createParty, deleteBill, getBill, getBills, getItems, getNextBillNo, getParties, getPartyDues, saveBill, updateBill } from './db.js'

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

export function apiPlugin() {
  const handler = async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    try {
      if (req.method === 'GET' && url.pathname === '/api/parties') {
        return send(res, 200, await getParties())
      }
      if (req.method === 'GET' && url.pathname === '/api/parties/all') {
        return send(res, 200, await listParties())
      }
      const partyMatch = url.pathname.match(/^\/api\/parties\/([^/]+)$/)
      if (partyMatch && partyMatch[1] !== 'new') {
        const id = decodeURIComponent(partyMatch[1])
        if (req.method === 'GET') return send(res, 200, await getParty(id))
        if (req.method === 'PUT') {
          await updateParty(id, await readJson(req))
          return send(res, 200, { ok: true })
        }
        if (req.method === 'DELETE') {
          await deleteParty(id)
          return send(res, 200, { ok: true })
        }
      }
      const itemMatch = url.pathname.match(/^\/api\/items\/([^/]+)$/)
      if (itemMatch && itemMatch[1] !== 'new') {
        const id = decodeURIComponent(itemMatch[1])
        if (req.method === 'PUT') {
          await updateItem(id, await readJson(req))
          return send(res, 200, { ok: true })
        }
        if (req.method === 'DELETE') {
          await deleteItem(id)
          return send(res, 200, { ok: true })
        }
      }
      if (req.method === 'POST' && url.pathname === '/api/parties/new') {
        return send(res, 200, await addParty(await readJson(req)))
      }
      if (req.method === 'POST' && url.pathname === '/api/items/new') {
        return send(res, 200, await addItem(await readJson(req)))
      }
      if (req.method === 'POST' && url.pathname === '/api/parties') {
        return send(res, 200, await createParty((await readJson(req)).name))
      }
      if (req.method === 'POST' && url.pathname === '/api/items') {
        return send(res, 200, await createItem((await readJson(req)).name))
      }
      if (req.method === 'GET' && url.pathname === '/api/items') {
        return send(res, 200, await getItems())
      }
      if (req.method === 'GET' && url.pathname === '/api/next-bill-no') {
        return send(res, 200, { billNo: await getNextBillNo() })
      }
      const party = url.pathname.match(/^\/api\/party\/([^/]+)$/)
      if (req.method === 'GET' && party) {
        return send(res, 200, await getPartyDues(decodeURIComponent(party[1])))
      }
      const billMatch = url.pathname.match(/^\/api\/bills\/(\d+)$/)
      if (billMatch && req.method === 'GET') {
        return send(res, 200, await getBill(Number(billMatch[1])))
      }
      if (billMatch && req.method === 'PUT') {
        await updateBill(Number(billMatch[1]), await readJson(req))
        return send(res, 200, { billNo: Number(billMatch[1]) })
      }
      if (billMatch && req.method === 'DELETE') {
        await deleteBill(Number(billMatch[1]))
        return send(res, 200, { billNo: Number(billMatch[1]) })
      }
      if (req.method === 'GET' && url.pathname === '/api/statement') {
        const q = url.searchParams
        return send(
          res,
          200,
          await getStatement({
            partyId: q.get('partyId') || undefined,
            from: q.get('from') ? Number(q.get('from')) : undefined,
            to: q.get('to') ? Number(q.get('to')) : undefined,
          })
        )
      }
      if (req.method === 'GET' && url.pathname === '/api/balances') {
        return send(res, 200, await getBalances({ partyId: url.searchParams.get('partyId') || undefined }))
      }
      const billLog = url.pathname.match(/^\/api\/bills\/(\d+)\/log$/)
      if (billLog && req.method === 'GET') return send(res, 200, await getBillLog(Number(billLog[1])))
      const txnLog = url.pathname.match(/^\/api\/transactions\/(\d+)\/log$/)
      if (txnLog && req.method === 'GET') return send(res, 200, await getTransactionLog(Number(txnLog[1])))
      const txnMatch = url.pathname.match(/^\/api\/transactions\/(\d+)$/)
      if (txnMatch && req.method === 'GET') {
        return send(res, 200, await getTransaction(Number(txnMatch[1])))
      }
      if (txnMatch && req.method === 'PUT') {
        await updateTransaction(Number(txnMatch[1]), await readJson(req))
        return send(res, 200, { ok: true })
      }
      if (txnMatch && req.method === 'DELETE') {
        await deleteTransaction(Number(txnMatch[1]))
        return send(res, 200, { ok: true })
      }
      if (req.method === 'GET' && url.pathname === '/api/transactions') {
        const q = url.searchParams
        return send(
          res,
          200,
          await getTransactions({
            partyId: q.get('partyId') || undefined,
            query: q.get('q') || undefined,
            from: q.get('from') ? Number(q.get('from')) : undefined,
            to: q.get('to') ? Number(q.get('to')) : undefined,
          })
        )
      }
      if (req.method === 'POST' && url.pathname === '/api/transactions') {
        await addTransaction(await readJson(req))
        return send(res, 200, { ok: true })
      }
      if (req.method === 'GET' && url.pathname === '/api/bills') {
        return send(res, 200, await getBills())
      }
      if (req.method === 'POST' && url.pathname === '/api/bills') {
        return send(res, 200, { billNo: await saveBill(await readJson(req)) })
      }
    } catch (e) {
      return send(res, 400, { error: String(e?.message || e) })
    }
    next()
  }

  return {
    name: 'erp-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
