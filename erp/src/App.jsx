import { useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar'
import ConfirmHost, { askConfirm } from './components/ConfirmHost'
import Transactions from './components/Transactions'
import TransactionForm from './components/TransactionForm'
import Statement from './components/Statement'
import Estimate from './components/Estimate'
import SaleList from './components/SaleList'
import AddParty from './components/AddParty'
import AddItem from './components/AddItem'
import AlterParty from './components/AlterParty'
import AlterItems from './components/AlterItems'
import PartyDetail from './components/PartyDetail'
import ItemDetail from './components/ItemDetail'
import PartySearch from './components/PartySearch'
import ItemRow from './components/ItemRow'
import AddItemSearch from './components/AddItemSearch'
import LabourPopup from './components/LabourPopup'
import PackagingPopup from './components/PackagingPopup'
import PasePopup from './components/PasePopup'
import MetalPopup from './components/MetalPopup'
import SettlementSection from './components/SettlementSection'
import { grandTotals, fmtRs, fmtWt, paseAmount, metalSettlement } from './calc'
import { createId } from './id'
import EditLog from './components/EditLog'
import { deleteBill, getBill, getBillLog, getNextBillNo, getPartyDues, saveBill, updateBill } from './api'
import './App.css'

const dateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const timeStr = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

const todayStr = () => dateStr(new Date())
const nowTimeStr = () => timeStr(new Date())

// billNo given: opens that bill read-only, with an Edit button.
function SaleForm({ billNo, startEditing, initialParty, onBack, onSaved, onPrint }) {
  const [mode, setMode] = useState(billNo ? (startEditing ? 'edit' : 'view') : 'new') // new | view | edit
  const [loading, setLoading] = useState(Boolean(billNo))
  const [partyId, setPartyId] = useState(null)
  const [partyName, setPartyName] = useState('')
  const [previousDues, setPreviousDues] = useState({ rs: 0, metal: 0 })
  const [invoiceNo, setInvoiceNo] = useState('')
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState(nowTimeStr)
  const [items, setItems] = useState([])
  const [settlement, setSettlement] = useState(null)
  const [received, setReceived] = useState('')

  // popup state: { kind: 'labour'|'packaging'|'pase'|'metal', itemId? }
  const [popup, setPopup] = useState(null)

  const totals = useMemo(() => grandTotals(items), [items])

  // Totals shown and saved always follow the current items, even if an item
  // was changed after the Pase/Metal popup was last saved.
  const liveSettlement = useMemo(() => {
    if (!settlement) return null
    if (settlement.mode === 'pase') {
      return {
        ...settlement,
        amount: paseAmount({ rate: settlement.rate, weightTotal: totals.wt, labourTotal: totals.rs }).total,
      }
    }
    const m = metalSettlement({
      rate: settlement.rate,
      rows: settlement.rows,
      weightTotal: totals.wt,
      labourTotal: totals.rs,
      bhavKatna: settlement.bhavKatna,
      katnaWt: settlement.katnaWt,
    })
    return { ...settlement, amount: m.total, metalBalance: m.metalBalance }
  }, [settlement, totals])

  const loadBill = async () => {
    const b = await getBill(billNo)
    const d = new Date(b.billTs)
    setPartyId(b.partyId)
    setPartyName(b.partyName)
    setPreviousDues(b.prevDues)
    setInvoiceNo(b.billNo)
    setDate(dateStr(d))
    setTime(timeStr(d))
    setItems(b.items)
    setSettlement(b.settlement)
    setReceived(b.received === 0 ? '' : String(b.received))
  }

  useEffect(() => {
    if (billNo) {
      loadBill()
        .catch((e) => window.alert(`Could not open bill: ${e.message}`))
        .finally(() => setLoading(false))
    } else {
      getNextBillNo().then(setInvoiceNo).catch(() => {})
      // Opened from a party's transactions: that party is already chosen.
      if (initialParty) handleSelectParty(initialParty)
    }
  }, [])

  const handleSelectParty = async (party) => {
    setPartyId(party.id)
    setPartyName(party.name)
    setPreviousDues(await getPartyDues(party.id))
  }

  const handleEditParty = () => {
    setPartyId(null)
    setPartyName('')
    setPreviousDues({ rs: 0, metal: 0 })
  }

  const handleSave = async () => {
    if (!partyId) return window.alert('Pick a party from the list before saving.')
    if (items.length === 0) return window.alert('Add at least one item before saving.')

    setSaving(true)
    try {
      const payload = {
        partyId,
        billTs: new Date(`${date}T${time}`).getTime(),
        items,
        totals,
        settlement: liveSettlement,
        received,
      }
      if (mode === 'edit') {
        await updateBill(billNo, payload)
        window.alert(`Bill #${billNo} updated.`)
        await loadBill()
        setMode('view')
      } else {
        const savedNo = await saveBill(payload)
        window.alert(`Bill #${savedNo} saved.`)
        onSaved()
      }
    } catch (e) {
      window.alert(`Could not save: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = async () => {
    await loadBill()
    setMode('view')
  }

  const readOnly = mode === 'view'

  // Edit trail under an opened sale; refreshed whenever the view is shown again.
  const [editLog, setEditLog] = useState([])
  useEffect(() => {
    if (billNo && mode === 'view') getBillLog(billNo).then(setEditLog).catch(() => {})
  }, [billNo, mode])

  const handleDelete = async () => {
    const ok = await askConfirm({
      title: `Delete sale #${billNo}?`,
      message: `${partyName}\n\nWarning: its entries are reversed and the party balance is restored. This cannot be undone.`,
    })
    if (!ok) return
    setSaving(true)
    try {
      await deleteBill(billNo)
      onBack()
    } catch (e) {
      window.alert(`Could not delete: ${e.message}`)
      setSaving(false)
    }
  }

  // The item's saved percentage and labour rate prefill the new line.
  const addItem = (master) => {
    const labour =
      master.rate == null
        ? null
        : master.rateMode === 'piece'
          ? { mode: 'piece', rate: master.rate, qty: '', ratePerKg: '' }
          : { mode: 'weight', rate: '', qty: '', ratePerKg: master.rate }
    setItems((list) => [
      ...list,
      { id: createId('item'), name: master.name, qty: '', pct: master.pct ?? 100, packaging: [], labour },
    ])
  }

  const updateItem = (id, next) => {
    setItems((list) => list.map((it) => (it.id === id ? next : it)))
  }

  const removeItem = (id) => {
    setItems((list) => list.filter((it) => it.id !== id))
  }

  const openPopup = (kind, itemId) => setPopup({ kind, itemId })
  const closePopup = () => setPopup(null)

  const activeItem = popup?.itemId ? items.find((it) => it.id === popup.itemId) : null

  const showLabour = popup?.kind === 'labour' && activeItem
  const showPackaging = popup?.kind === 'packaging' && activeItem
  const showPase = popup?.kind === 'pase'
  const showMetal = popup?.kind === 'metal'

  if (loading) return <div className="salelist-empty">Loading…</div>

  return (
    <>
      <TopBar readOnly={readOnly} onBack={onBack} onPrint={billNo && mode === 'view' ? onPrint : undefined} invoiceNo={invoiceNo} date={date} onDateChange={setDate} time={time} onTimeChange={setTime} />
      <div className="stage">
        <div className="side-col side-col-left">
          <div className="side-slot">
            {showLabour && (
              <LabourPopup
                side="left"
                initial={activeItem.labour}
                onSave={(labour) => updateItem(activeItem.id, { ...activeItem, labour })}
                onClose={closePopup}
              />
            )}
          </div>
          <div className="side-slot">
            {showPase && (
              <PasePopup
                side="left"
                totals={totals}
                initial={settlement?.mode === 'pase' ? settlement : null}
                onSave={setSettlement}
                onClose={closePopup}
              />
            )}
          </div>
        </div>

        <div className="main-card">
          <PartySearch
            readOnly={Boolean(billNo)}
            value={partyName}
            onSelect={handleSelectParty}
            onEdit={handleEditParty}
          />

          <div className="dues-row">
            <span className="dues-label">PREVIOUS DUES</span>
            <div className="dues-values">
              <span className="chip">Rs {previousDues.rs}</span>
              <span className="chip">{previousDues.metal}gm</span>
            </div>
          </div>

          <div className="items-box">
            <div className="items-head">
              <span className="items-head-name" />
              <span>Qnt</span>
              <span>net wt</span>
              <span className="items-head-narrow">%</span>
              <span />
            </div>

            {items.map((item, idx) => (
              <ItemRow
                key={item.id}
                item={item}
                index={idx}
                onChange={(next) => updateItem(item.id, next)}
                onOpenLabour={() => openPopup('labour', item.id)}
                onOpenPackaging={() => openPopup('packaging', item.id)}
                onRemove={() => removeItem(item.id)}
                readOnly={readOnly}
              />
            ))}

            {!readOnly && <AddItemSearch onAdd={addItem} />}
          </div>

          <div className="totals-row">
            <span className="field-label">TOTAL</span>
            <span className="chip">{fmtRs(totals.rs)}</span>
            <span className="chip">{fmtWt(totals.wt)}</span>
          </div>

          <SettlementSection
            readOnly={readOnly}
            totalWeight={totals.wt}
            settlement={liveSettlement}
            received={received}
            onReceivedChange={setReceived}
            onOpenPase={() => openPopup('pase')}
            onOpenMetal={() => openPopup('metal')}
            onReopenSettlement={() => openPopup(settlement?.mode === 'pase' ? 'pase' : 'metal')}
            onClearSettlement={() => setSettlement(null)}
          />

          {mode === 'view' ? (
            <div className="form-actions">
              <button type="button" className="btn-primary btn-save" onClick={() => setMode('edit')}>
                EDIT
              </button>
              <button type="button" className="btn-danger btn-save" onClick={handleDelete} disabled={saving}>
                DELETE
              </button>
            </div>
          ) : (
            <div className="form-actions">
              {mode === 'edit' && (
                <button type="button" className="btn-ghost btn-save" onClick={cancelEdit} disabled={saving}>
                  CANCEL
                </button>
              )}
              <button type="button" className="btn-primary btn-save" onClick={handleSave} disabled={saving}>
                {saving ? 'SAVING…' : mode === 'edit' ? 'SAVE CHANGES' : 'SAVE'}
              </button>
            </div>
          )}

          {mode === 'view' && <EditLog entries={editLog} />}
        </div>

        <div className="side-col side-col-right">
          <div className="side-slot">
            {showPackaging && (
              <PackagingPopup
                side="right"
                initial={activeItem.packaging}
                onSave={(rows) => updateItem(activeItem.id, { ...activeItem, packaging: rows })}
                onClose={closePopup}
              />
            )}
          </div>
          <div className="side-slot">
            {showMetal && (
              <MetalPopup
                side="right"
                totals={totals}
                initial={settlement?.mode === 'metal' ? settlement : null}
                onSave={setSettlement}
                onClose={closePopup}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function Screens() {
  // 'list' | 'new' | 'alterParty' | 'addParty' | 'alterItem' | 'addItem' | { billNo, edit? } to view (or edit) a bill
  const [screen, setScreen] = useState('list')
  // Party picked on the Transactions screen; kept while its sub-screens are open.
  const [txnParty, setTxnParty] = useState(null)
  const [txnRange, setTxnRange] = useState({ from: '', to: '' })

  // The list refetches every time it mounts, so changes show up on return.
  if (screen === 'transactions') {
    return (
      <Transactions
        party={txnParty}
        onPartyChange={setTxnParty}
        range={txnRange}
        onRangeChange={setTxnRange}
        onPrint={() => setScreen({ statement: true, back: 'transactions' })}
        onBack={() => setScreen('list')}
        onTxn={(direction, party) => setScreen({ txn: direction, party })}
        onAddSale={(party) => setScreen({ newFor: party })}
        onOpenBill={(billNo) => setScreen({ billNo, back: 'transactions' })}
        onOpenTxn={(t) => setScreen({ txn: t.kind === 'txn_in' ? 'in' : 'out', party: { id: t.partyId, name: t.partyName }, txnId: t.id })}
      />
    )
  }
  if (screen.txn) {
    return (
      <TransactionForm
        direction={screen.txn}
        party={screen.party}
        txnId={screen.txnId}
        onBack={() => setScreen('transactions')}
        onDone={() => setScreen('transactions')}
      />
    )
  }
  if (screen === 'alterParty') {
    return (
      <AlterParty
        onBack={() => setScreen('list')}
        onAdd={() => setScreen('addParty')}
        onOpen={(p) => setScreen({ partyDetail: p.id })}
      />
    )
  }
  if (screen === 'addParty') {
    return <AddParty onBack={() => setScreen('alterParty')} onDone={() => setScreen('alterParty')} />
  }
  if (screen.partyDetail) {
    return (
      <PartyDetail partyId={screen.partyDetail} onBack={() => setScreen('alterParty')} onDone={() => setScreen('alterParty')} />
    )
  }
  if (screen === 'alterItem') {
    return (
      <AlterItems
        onBack={() => setScreen('list')}
        onAdd={() => setScreen('addItem')}
        onOpen={(item) => setScreen({ itemDetail: item })}
      />
    )
  }
  if (screen === 'addItem') {
    return <AddItem onBack={() => setScreen('alterItem')} onDone={() => setScreen('alterItem')} />
  }
  if (screen.itemDetail) {
    return <ItemDetail item={screen.itemDetail} onBack={() => setScreen('alterItem')} onDone={() => setScreen('alterItem')} />
  }
  if (screen === 'list') {
    return (
      <SaleList
        onAlterParty={() => setScreen('alterParty')}
        onAlterItem={() => setScreen('alterItem')}
        onAdd={() => setScreen('new')}
        onOpen={(billNo) => setScreen({ billNo })}
        onEdit={(billNo) => setScreen({ billNo, edit: true })}
        onPrint={(billNo) => setScreen({ estimate: billNo })}
        onTransactions={() => setScreen('transactions')}
      />
    )
  }
  if (screen.statement) {
    return <Statement party={txnParty} range={txnRange} onBack={() => setScreen('transactions')} />
  }
  if (screen.estimate) {
    return <Estimate billNo={screen.estimate} onBack={() => setScreen(screen.back || 'list')} />
  }
  return (
    <SaleForm
      key={screen === 'new' ? 'new' : screen.newFor ? `new-${screen.newFor.id}` : screen.billNo}
      billNo={screen === 'new' || screen.newFor ? undefined : screen.billNo}
      startEditing={screen !== 'new' && !screen.newFor && screen.edit}
      initialParty={screen.newFor}
      onPrint={() => setScreen({ estimate: screen.billNo, back: screen })}
      onBack={() => setScreen(screen.newFor ? 'transactions' : screen.back || 'list')}
      onSaved={() => setScreen(screen.newFor ? 'transactions' : 'list')}
    />
  )
}

export default function App() {
  return (
    <>
      <Screens />
      <ConfirmHost />
    </>
  )
}
