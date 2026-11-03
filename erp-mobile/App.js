import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native'
import TopBar from './src/components/TopBar'
import SaleList from './src/components/SaleList'
import Transactions from './src/components/Transactions'
import TransactionForm from './src/components/TransactionForm'
import Statement from './src/components/Statement'
import Estimate from './src/components/Estimate'
import AddParty from './src/components/AddParty'
import AddItem from './src/components/AddItem'
import AlterParty from './src/components/AlterParty'
import AlterItems from './src/components/AlterItems'
import PartyDetail from './src/components/PartyDetail'
import ItemDetail from './src/components/ItemDetail'
import PartySearch from './src/components/PartySearch'
import AddItemSearch from './src/components/AddItemSearch'
import ItemRow from './src/components/ItemRow'
import LabourPopup from './src/components/LabourPopup'
import PackagingPopup from './src/components/PackagingPopup'
import PasePopup from './src/components/PasePopup'
import MetalPopup from './src/components/MetalPopup'
import SettlementSection from './src/components/SettlementSection'
import { grandTotals, fmtRs, fmtWt, paseAmount, metalSettlement } from './src/calc'
import { createId } from './src/id'
import EditLog from './src/components/EditLog'
import { deleteBill, getBill, getBillLog, getNextBillNo, getPartyDues, saveBill, updateBill } from './src/db'
import { useTheme } from './src/theme'

// billNo given: opens that bill read-only, with an Edit button.
function SaleForm({ billNo, startEditing, initialParty, onBack, onSaved, onPrint }) {
  const [mode, setMode] = useState(billNo ? (startEditing ? 'edit' : 'view') : 'new') // new | view | edit
  const [loading, setLoading] = useState(Boolean(billNo))
  const theme = useTheme()
  const scheme = useColorScheme()
  const styles = makeStyles(theme)

  const [partyId, setPartyId] = useState(null)
  const [partyName, setPartyName] = useState('')
  const [previousDues, setPreviousDues] = useState({ rs: 0, metal: 0 })
  const [invoiceNo, setInvoiceNo] = useState('')
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(() => new Date())
  const [time, setTime] = useState(() => new Date())
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
    setPartyId(b.partyId)
    setPartyName(b.partyName)
    setPreviousDues(b.prevDues)
    setInvoiceNo(b.billNo)
    setDate(new Date(b.billTs))
    setTime(new Date(b.billTs))
    setItems(b.items)
    setSettlement(b.settlement)
    setReceived(b.received === 0 ? '' : String(b.received))
  }

  useEffect(() => {
    if (billNo) {
      loadBill()
        .catch((e) => Alert.alert('Could not open bill', String(e?.message || e)))
        .finally(() => setLoading(false))
    } else {
      getNextBillNo().then(setInvoiceNo)
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
    if (!partyId) return Alert.alert('Select a party', 'Pick a party from the list before saving.')
    if (items.length === 0) return Alert.alert('No items', 'Add at least one item before saving.')

    // Date and time are separate pickers; combine them into one timestamp.
    const billTs = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes()
    ).getTime()

    setSaving(true)
    try {
      const payload = { partyId, billTs, items, totals, settlement: liveSettlement, received }
      if (mode === 'edit') {
        await updateBill(billNo, payload)
        Alert.alert('Updated', `Bill #${billNo} updated.`)
        await loadBill()
        setMode('view')
      } else {
        const savedNo = await saveBill(payload)
        Alert.alert('Saved', `Bill #${savedNo} saved.`)
        onSaved()
      }
    } catch (e) {
      Alert.alert('Could not save', String(e?.message || e))
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

  const confirmDelete = () =>
    Alert.alert(
      `Delete sale #${billNo}?`,
      `${partyName}\n\nWarning: its entries are reversed and the party balance is restored. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true)
            try {
              await deleteBill(billNo)
              onBack()
            } catch (e) {
              setSaving(false)
              Alert.alert('Could not delete', String(e?.message || e))
            }
          },
        },
      ]
    )

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

  if (loading) {
    return (
      <View style={styles.root}>
        <Text style={styles.loading}>Loading…</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <TopBar readOnly={readOnly} onBack={onBack} onPrint={billNo && mode === 'view' ? onPrint : undefined} invoiceNo={invoiceNo} date={date} onDateChange={setDate} time={time} onTimeChange={setTime} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <PartySearch
              readOnly={Boolean(billNo)}
              value={partyName}
              onSelect={handleSelectParty}
              onEdit={handleEditParty}
            />

            <View style={styles.duesRow}>
              <Text style={styles.duesLabel}>PREVIOUS DUES</Text>
              <View style={styles.duesValues}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Rs {previousDues.rs}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{previousDues.metal}gm</Text>
                </View>
              </View>
            </View>

            <View style={styles.itemsBox}>
              <View style={styles.itemsHead}>
                <View style={styles.itemsHeadName} />
                <Text style={styles.itemsHeadText}>Qnt</Text>
                <Text style={styles.itemsHeadText}>net wt</Text>
                <Text style={[styles.itemsHeadText, styles.itemsHeadNarrow]}>%</Text>
                <View style={styles.itemsHeadRemove} />
              </View>

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
            </View>

            <View style={styles.totalsRow}>
              <Text style={styles.fieldLabel}>TOTAL</Text>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{fmtRs(totals.rs)}</Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{fmtWt(totals.wt)}</Text>
              </View>
            </View>

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
              <View style={styles.formActions}>
                <Pressable style={[styles.saveBtn, styles.flex]} onPress={() => setMode('edit')}>
                  <Text style={styles.saveBtnText}>EDIT</Text>
                </Pressable>
                <Pressable style={[styles.deleteBtn, styles.flex, saving && styles.saveBtnDisabled]} onPress={confirmDelete} disabled={saving}>
                  <Text style={styles.deleteBtnText}>DELETE</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.formActions}>
                {mode === 'edit' && (
                  <Pressable style={[styles.cancelBtn, saving && styles.saveBtnDisabled]} onPress={cancelEdit} disabled={saving}>
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.saveBtn, styles.flex, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>
                    {saving ? 'SAVING…' : mode === 'edit' ? 'SAVE CHANGES' : 'SAVE'}
                  </Text>
                </Pressable>
              </View>
            )}

            {mode === 'view' && <EditLog entries={editLog} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Mounted only while open, so each open starts from the saved data. */}
      {popup?.kind === 'labour' && activeItem && (
        <LabourPopup
          visible
          initial={activeItem.labour}
          onSave={(labour) => updateItem(activeItem.id, { ...activeItem, labour })}
          onClose={closePopup}
        />
      )}

      {popup?.kind === 'packaging' && activeItem && (
        <PackagingPopup
          visible
          initial={activeItem.packaging}
          onSave={(rows) => updateItem(activeItem.id, { ...activeItem, packaging: rows })}
          onClose={closePopup}
        />
      )}

      {popup?.kind === 'pase' && (
        <PasePopup
          visible
          totals={totals}
          initial={settlement?.mode === 'pase' ? settlement : null}
          onSave={setSettlement}
          onClose={closePopup}
        />
      )}

      {popup?.kind === 'metal' && (
        <MetalPopup
          visible
          totals={totals}
          initial={settlement?.mode === 'metal' ? settlement : null}
          onSave={setSettlement}
          onClose={closePopup}
        />
      )}
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    flex: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      padding: 16,
      gap: 14,
    },
    duesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    duesLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: theme.inkSoft,
      textTransform: 'uppercase',
    },
    duesValues: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 12,
      backgroundColor: theme.chipBg,
    },
    chipText: { fontSize: 13, color: theme.ink },
    itemsBox: {
      zIndex: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 12,
      gap: 10,
      minHeight: 120,
    },
    itemsHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 },
    itemsHeadName: { flex: 1 },
    itemsHeadText: {
      width: 52,
      fontSize: 10,
      fontWeight: '700',
      color: theme.inkSoft,
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    itemsHeadNarrow: { width: 44 },
    itemsHeadRemove: { width: 20 },
    saveBtn: {
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    formActions: { flexDirection: 'row', gap: 10 },
    deleteBtn: {
      borderWidth: 1,
      borderColor: theme.danger,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    deleteBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.danger },
    cancelBtn: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 22,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.ink },
    loading: { textAlign: 'center', color: theme.inkSoft, paddingVertical: 60 },
    saveBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.accentInk },
    totalsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: theme.inkSoft,
      textTransform: 'uppercase',
    },
  })
}

export default function App() {
  // 'list' | 'new' | 'alterParty' | 'addParty' | 'alterItem' | 'addItem' | { billNo, edit? } to view (or edit) a bill
  const [screen, setScreen] = useState('list')
  // Party picked on the Transactions screen; kept while its sub-screens are open.
  const [txnParty, setTxnParty] = useState(null)
  const [txnRange, setTxnRange] = useState({ from: null, to: null })

  // Android's back button goes up one level: Add Party/Items -> Alter Party/Items -> list.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'addParty' || screen.partyDetail) {
        setScreen('alterParty')
        return true
      }
      if (screen === 'addItem' || screen.itemDetail) {
        setScreen('alterItem')
        return true
      }
      if (screen.txn || screen.newFor) {
        setScreen('transactions')
        return true
      }
      if (screen !== 'list') {
        setScreen(screen.back || 'list')
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [screen])

  // The list refetches every time it mounts, so changes show up on return.
  if (screen === 'list') {
    return (
      <SaleList
        onAdd={() => setScreen('new')}
        onOpen={(billNo) => setScreen({ billNo })}
        onEdit={(billNo) => setScreen({ billNo, edit: true })}
        onAlterParty={() => setScreen('alterParty')}
        onAlterItem={() => setScreen('alterItem')}
        onPrint={(billNo) => setScreen({ estimate: billNo })}
        onTransactions={() => setScreen('transactions')}
      />
    )
  }
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
  if (screen.statement) {
    return <Statement party={txnParty} range={txnRange} onBack={() => setScreen('transactions')} />
  }
  if (screen.estimate) {
    return <Estimate billNo={screen.estimate} onBack={() => setScreen(screen.back || 'list')} />
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
