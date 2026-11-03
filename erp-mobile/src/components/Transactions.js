import { useEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import PageHeader, { pageTopPadding } from './PageHeader'
import { getBalances, getParties, getTransactions } from '../db'
import { kindLabel } from '../txn'
import { useTheme } from '../theme'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')
const fmtDate = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${String(d.getFullYear()).slice(2)}`
}
const fmtDateDMY = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
const fmtTime = (ts) => {
  const d = new Date(ts)
  return `${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}
const dayStart = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() : undefined)
const dayEnd = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime() : undefined)

const group = (n) => Math.round(Math.abs(n)).toLocaleString('en-IN')
// No +/- sign: the colour (and Transaction In / Out) already says which way it moved.
const signed = (n, text) => text
// Positive = the party owes the shop (Naam), negative = the shop owes the party (Jama).
const owed = (n, text) => `${text}${n < 0 ? ' (Jama)' : n > 0 ? ' (Naam)' : ''}`
const grams = (n) => `${Math.round(Math.abs(n) * 1000) / 1000}g`

export default function Transactions({ party, onPartyChange, onBack, onTxn, onAddSale, onOpenBill, onOpenTxn, range, onRangeChange, onPrint }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [parties, setParties] = useState([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // The date range lives in App so it survives opening a bill or a transaction.
  const { from, to } = range
  const setFrom = (v) => onRangeChange({ ...range, from: v })
  const setTo = (v) => onRangeChange({ ...range, to: v })
  const [picking, setPicking] = useState(null) // 'from' | 'to'
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [balances, setBalances] = useState({ cash: 0, metal: 0 })

  useEffect(() => {
    getParties().then(setParties)
  }, [])

  useEffect(() => {
    let live = true
    getTransactions({
      partyId: party?.id,
      query: party ? undefined : query.trim(),
      from: dayStart(from),
      to: dayEnd(to),
    })
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]))
      .finally(() => live && setLoaded(true))
    return () => {
      live = false
    }
  }, [party, query, from, to])

  // Current totals for the selected party, or for every party.
  useEffect(() => {
    getBalances({ partyId: party?.id })
      .then(setBalances)
      .catch(() => {})
  }, [party, rows])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    return parties.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 6)
  }, [parties, query])

  // Sale entries open that bill (unless it was deleted); live Transaction In/Out
  // entries open for viewing, editing and deleting. Everything else is history.
  const openFor = (t) => {
    if (t.billNo) return t.billDeleted ? undefined : () => onOpenBill(t.billNo)
    if ((t.kind === 'txn_in' || t.kind === 'txn_out') && !t.voided) return () => onOpenTxn(t)
    return undefined
  }

  const pick = (p) => {
    onPartyChange(p)
    setQuery('')
    setOpen(false)
  }

  const dateButton = (label, value, which) => (
    <View style={styles.dateWrap}>
      <Text style={styles.dateLabel}>{label}</Text>
      <View style={styles.dateBtn}>
        <Pressable style={styles.dateBtnMain} onPress={() => setPicking(which)}>
          <Text style={value ? styles.dateText : styles.datePlaceholder}>{value ? fmtDateDMY(value) : 'dd/mm/yyyy'}</Text>
        </Pressable>
        {value && (
          <Pressable hitSlop={8} onPress={() => (which === 'from' ? setFrom(null) : setTo(null))}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  )

  return (
    <View style={styles.root}>
      <PageHeader title="Transactions" onBack={onBack} />

      <View style={styles.totals}>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>{party ? 'Current cash' : 'Total cash'}</Text>
          <Text style={styles.totalValue}>{owed(balances.cash, `Rs ${group(balances.cash)}`)}</Text>
        </View>
        <View style={styles.total}>
          <Text style={styles.totalLabel}>{party ? 'Current metal' : 'Total metal'}</Text>
          <Text style={styles.totalValue}>{owed(balances.metal, grams(balances.metal))}</Text>
        </View>
      </View>

      <View style={styles.filters}>
        {party ? (
          <View style={styles.partyChip}>
            <Text style={styles.partyChipText}>{party.name}</Text>
            <Pressable hitSlop={10} onPress={() => onPartyChange(null)}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          </View>
        ) : (
          <TextInput
            style={styles.search}
            placeholder="Search party"
            placeholderTextColor={theme.inkSoft}
            value={query}
            onChangeText={(t) => {
              setQuery(t)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
          />
        )}
        {open && !party && !!query.trim() && (
          <View style={styles.dropdown}>
            {matches.length === 0 && <Text style={styles.dropdownEmpty}>No matching party</Text>}
            {matches.map((p) => (
              <Pressable key={p.id} style={styles.dropdownItem} onPress={() => pick(p)}>
                <Text style={styles.dropdownText}>{p.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.dates}>
          {dateButton('From', from, 'from')}
          {dateButton('To', to, 'to')}
          <Pressable
            style={[styles.printBtn, rows.length === 0 && styles.printBtnOff]}
            disabled={rows.length === 0}
            onPress={onPrint}
            hitSlop={6}
          >
            <Text style={styles.printIcon}>🖨</Text>
          </Pressable>
        </View>
      </View>

      {picking && (
        <DateTimePicker
          value={(picking === 'from' ? from : to) || new Date()}
          mode="date"
          display="default"
          maximumDate={picking === 'from' ? to || undefined : undefined}
          minimumDate={picking === 'to' ? from || undefined : undefined}
          onChange={(event, selected) => {
            const which = picking
            setPicking(null)
            if (event.type === 'set' && selected) (which === 'from' ? setFrom : setTo)(selected)
          }}
        />
      )}

      <FlatList
        data={rows}
        keyExtractor={(t) => `${t.id}-${t.kind}`}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loaded ? <Text style={styles.empty}>No transactions found.</Text> : null}
        renderItem={({ item: t }) => (
          <Pressable style={styles.card} disabled={!openFor(t)} onPress={openFor(t)}>
            <View style={styles.cardTop}>
              <View style={styles.flex}>
                <Text style={styles.party}>{t.partyName}</Text>
                <Text style={styles.kind}>{kindLabel(t)}</Text>
              </View>
              <View style={styles.when}>
                <Text style={styles.whenText}>{fmtDate(t.ts)}</Text>
                <Text style={styles.whenText}>{fmtTime(t.ts)}</Text>
              </View>
            </View>
            <View style={styles.amounts}>
              {t.cash != null && (
                <View>
                  <Text style={styles.amountLabel}>Cash</Text>
                  <Text style={[styles.amount, t.cash > 0 ? styles.up : styles.down]}>
                    {signed(t.cash, `Rs ${group(t.cash)}`)}
                  </Text>
                  <Text style={styles.amountLabel}>Balance Rs {Math.round(t.cashAfter).toLocaleString('en-IN')}</Text>
                </View>
              )}
              {t.metal != null && (
                <View>
                  <Text style={styles.amountLabel}>Metal</Text>
                  <Text style={[styles.amount, t.metal > 0 ? styles.up : styles.down]}>{signed(t.metal, grams(t.metal))}</Text>
                  <Text style={styles.amountLabel}>Balance {Math.round(t.metalAfter * 1000) / 1000}g</Text>
                </View>
              )}
            </View>
          </Pressable>
        )}
      />

      {party && (
        <View style={styles.pills}>
          <Pressable style={styles.pillGhost} onPress={() => onTxn('in', party)}>
            <Text style={styles.pillGhostText}>Transaction In</Text>
          </Pressable>
          <Pressable style={styles.pillGhost} onPress={() => onTxn('out', party)}>
            <Text style={styles.pillGhostText}>Transaction Out</Text>
          </Pressable>
          <Pressable style={styles.pillMain} onPress={() => onAddSale(party)}>
            <Text style={styles.pillMainText}>+ Add Sale</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg, paddingTop: pageTopPadding },
    flex: { flex: 1 },
    totals: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingTop: 12 },
    total: {
      flex: 1,
      gap: 2,
      backgroundColor: theme.chipBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    totalLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: theme.inkSoft, textTransform: 'uppercase' },
    totalValue: { fontSize: 17, fontWeight: '600', color: theme.ink },
    filters: { padding: 14, gap: 10 },
    search: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.ink,
    },
    partyChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    partyChipText: { fontSize: 15, color: theme.ink },
    clearText: { fontSize: 20, color: theme.inkSoft },
    dropdown: { backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 10 },
    dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderColor: theme.border },
    dropdownText: { fontSize: 14, color: theme.ink },
    dropdownEmpty: { padding: 12, fontSize: 13, color: theme.inkSoft },
    dates: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
    printBtn: {
      width: 48,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
    },
    printBtnOff: { opacity: 0.4 },
    printIcon: { fontSize: 20, color: theme.ink },
    dateWrap: { flex: 1, gap: 4 },
    dateLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: theme.inkSoft, textTransform: 'uppercase' },
    dateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    dateBtnMain: { flex: 1, paddingVertical: 10 },
    dateText: { fontSize: 14, color: theme.ink },
    datePlaceholder: { fontSize: 14, color: theme.inkSoft },
    list: { padding: 14, paddingTop: 4, gap: 12, paddingBottom: 110 },
    empty: { textAlign: 'center', color: theme.inkSoft, paddingVertical: 48 },
    card: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      elevation: 2,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    party: { fontSize: 16, color: theme.ink },
    kind: { fontSize: 13, color: theme.inkSoft, marginTop: 2 },
    when: { alignItems: 'flex-end' },
    whenText: { fontSize: 12, color: theme.inkSoft },
    amounts: { flexDirection: 'row', gap: 28, marginTop: 10 },
    amountLabel: { fontSize: 12, color: theme.inkSoft },
    amount: { fontSize: 17, fontWeight: '600', marginVertical: 2 },
    up: { color: '#d98a12' },
    down: { color: '#1d9b6c' },
    pills: {
      position: 'absolute',
      bottom: 24,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 12,
    },
    pillGhost: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 30,
      paddingVertical: 14,
      paddingHorizontal: 18,
      elevation: 8,
    },
    pillGhostText: { color: theme.ink, fontSize: 15, fontWeight: '500' },
    pillMain: { backgroundColor: '#f0224f', borderRadius: 30, paddingVertical: 14, paddingHorizontal: 22, elevation: 8 },
    pillMainText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  })
}
