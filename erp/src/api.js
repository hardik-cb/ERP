// Talks to the dev-server API in server/api.js, which stores data in data/erp.db.
async function request(path, options) {
  const res = await fetch(path, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const getParties = () => request('/api/parties')

const post = (path, body) =>
  request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const createParty = (name) => post('/api/parties', { name })

export const createItem = (name) => post('/api/items', { name })

// Full "Add Party" / "Add Item" forms (a taken name is an error).
export const addParty = (fields) => post('/api/parties/new', fields)

export const addItem = (fields) => post('/api/items/new', fields)

export const getItems = () => request('/api/items')

export const getBills = () => request('/api/bills')

export const getBill = (billNo) => request(`/api/bills/${billNo}`)

export const updateBill = (billNo, bill) =>
  request(`/api/bills/${billNo}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  }).then((d) => d.billNo)

export const deleteBill = (billNo) => request(`/api/bills/${billNo}`, { method: 'DELETE' })

export const getNextBillNo = () => request('/api/next-bill-no').then((d) => d.billNo)

export const getPartyDues = (partyId) => request(`/api/party/${encodeURIComponent(partyId)}`)

export const saveBill = (bill) =>
  request('/api/bills', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bill),
  }).then((d) => d.billNo)

// Ledger movements (latest first). Filters: partyId, q (name search), from/to (epoch ms).
export const getTransactions = (filters = {}) => {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) if (v != null && v !== '') params.set(k, v)
  return request(`/api/transactions?${params}`)
}

// direction: 'in' (party pays/gives, their balance falls) or 'out' (shop pays/gives, it rises).
export const addTransaction = (fields) => post('/api/transactions', fields)

// Current cash/metal owed: one party's (partyId) or all parties' totals.
export const getBalances = (partyId) => request(`/api/balances${partyId ? `?partyId=${encodeURIComponent(partyId)}` : ''}`)

export const getTransaction = (id) => request(`/api/transactions/${id}`)

export const updateTransaction = (id, fields) =>
  request(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })

export const deleteTransaction = (id) => request(`/api/transactions/${id}`, { method: 'DELETE' })

// Detailed statement: sales (with full bills) and transactions, oldest first.
export const getStatement = (filters = {}) => {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(filters)) if (v != null && v !== '') params.set(k, v)
  return request(`/api/statement?${params}`)
}

// Alter Party / Alter Items.
const put = (path, body) =>
  request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const listParties = () => request('/api/parties/all')
export const getParty = (id) => request(`/api/parties/${encodeURIComponent(id)}`)
export const updateParty = (id, fields) => put(`/api/parties/${encodeURIComponent(id)}`, fields)
export const deleteParty = (id) => request(`/api/parties/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const updateItem = (id, fields) => put(`/api/items/${encodeURIComponent(id)}`, fields)
export const deleteItem = (id) => request(`/api/items/${encodeURIComponent(id)}`, { method: 'DELETE' })

// Edit trail of one sale / one Transaction In/Out (shown at the bottom of its view).
export const getBillLog = (billNo) => request(`/api/bills/${billNo}/log`)
export const getTransactionLog = (id) => request(`/api/transactions/${id}/log`)
