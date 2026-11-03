import { useEffect, useRef, useState } from 'react'
import { Alert, Animated, FlatList, Modal, Pressable, StatusBar, StyleSheet, Text, TextInput, View, Platform } from 'react-native'
import { deleteBill, getBills } from '../db'
import { shareEstimate } from '../estimate'
import { useTheme } from '../theme'

// There is no due-date field on a bill yet, so it is shown as the sale date
// plus a fixed credit period.
const DUE_DAYS = 30

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n) => String(n).padStart(2, '0')

function fmtDate(ts) {
  const d = new Date(ts)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]}, ${String(d.getFullYear()).slice(2)}`
}

function fmtTime(ts) {
  const d = new Date(ts)
  const h = d.getHours() % 12 || 12
  return `${pad(h)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`
}

function statusOf(bill) {
  if (bill.balance <= 0 && bill.metalDue <= 0) return 'PAID'
  if (bill.received > 0) return 'PARTIAL'
  return 'UNPAID'
}

const BADGE = {
  UNPAID: { color: '#d98a12', bg: 'rgba(240,160,40,0.18)' },
  PAID: { color: '#1d9b6c', bg: 'rgba(40,190,130,0.18)' },
  PARTIAL: { color: '#1f95c9', bg: 'rgba(50,160,220,0.18)' },
}

const rs = (n) => `₹ ${Math.round(n)}`
const withMetal = (text, g) =>
  g > 0 ? `${text} + ${Math.round(g)}g` : g < 0 ? `${text} − ${Math.round(-g)}g` : text

export default function SaleList({ onAdd, onOpen, onEdit, onAlterParty, onAlterItem, onPrint, onTransactions }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [bills, setBills] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const [menuBill, setMenuBill] = useState(null) // bill whose ⋮ menu is open

  // The + circle pops out Alter Party / Alter Items above itself.
  const [plusOpen, setPlusOpen] = useState(false)
  const pop = useRef(new Animated.Value(0)).current
  const [fabsBox, setFabsBox] = useState({ x: 0, w: 0 })
  const [plusBox, setPlusBox] = useState({ x: 0, w: 0 })
  const setPlus = (open) => {
    setPlusOpen(open)
    Animated.timing(pop, { toValue: open ? 1 : 0, duration: 170, useNativeDriver: true }).start()
  }
  const pick = (go) => {
    setPlus(false)
    go()
  }
  const MENU_W = 190
  const plusCenter = fabsBox.x + plusBox.x + plusBox.w / 2

  const load = () =>
    getBills()
      .then(setBills)
      .finally(() => setLoaded(true))

  useEffect(() => {
    load()
  }, [])

  // Print opens the estimate preview; share sends the PDF straight to the share sheet.
  const share = async (billNo) => {
    try {
      await shareEstimate(billNo)
    } catch (e) {
      Alert.alert('Could not share', String(e?.message || e))
    }
  }

  const confirmDelete = (b) => {
    setMenuBill(null)
    Alert.alert(
      `Delete sale #${b.billNo}?`,
      `${b.partyName}. Its entries are reversed and the party balance is restored.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBill(b.billNo)
              await load()
            } catch (e) {
              Alert.alert('Could not delete', String(e?.message || e))
            }
          },
        },
      ]
    )
  }

  const q = query.trim().toLowerCase()
  const shown = q
    ? bills.filter((b) => b.partyName.toLowerCase().includes(q) || String(b.billNo).includes(q.replace('#', '')))
    : bills

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>←</Text>
        {searching ? (
          <TextInput
            style={styles.searchInput}
            autoFocus
            placeholder="Search party or sale no."
            placeholderTextColor={theme.inkSoft}
            value={query}
            onChangeText={setQuery}
          />
        ) : (
          <Text style={styles.title}>Sale list</Text>
        )}
        <Pressable
          hitSlop={10}
          onPress={() => {
            setSearching((s) => !s)
            setQuery('')
          }}
        >
          <Text style={styles.headerIcon}>🔍</Text>
        </Pressable>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(b) => String(b.billNo)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loaded ? (
            <Text style={styles.empty}>
              {bills.length === 0 ? 'No sales yet. Tap “Add Sale” to create one.' : 'No matching sales.'}
            </Text>
          ) : null
        }
        renderItem={({ item: b }) => {
          const st = statusOf(b)
          return (
            <Pressable style={styles.card} onPress={() => onOpen(b.billNo)}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <View style={styles.nameRow}>
                    <Text style={styles.party} numberOfLines={1}>
                      {b.partyName}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: BADGE[st].bg }]}>
                      <Text style={[styles.badgeText, { color: BADGE[st].color }]}>{st}</Text>
                    </View>
                  </View>
                  <Text style={styles.amount}>{withMetal(rs(b.amount), b.metalDue)}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.rightText}>Sale #{b.billNo}</Text>
                  <Text style={styles.rightText}>
                    {fmtDate(b.billTs)} • {fmtTime(b.billTs)}
                  </Text>
                </View>
              </View>

              <View style={[styles.row, styles.bottomRow]}>
                <View>
                  <Text style={styles.meta}>Balance: {withMetal(rs(b.balance), b.metalDue)}</Text>
                  <Text style={styles.meta}>Due Date: {fmtDate(b.billTs + DUE_DAYS * 86400000)}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable hitSlop={12} onPress={() => onPrint(b.billNo)}>
                    <Text style={styles.action}>🖨</Text>
                  </Pressable>
                  <Pressable hitSlop={12} onPress={() => share(b.billNo)}>
                    <Text style={styles.action}>↗</Text>
                  </Pressable>
                  <Pressable hitSlop={12} onPress={() => setMenuBill(b)}>
                    <Text style={styles.action}>⋮</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          )
        }}
      />

      <Modal visible={!!menuBill} transparent animationType="fade" onRequestClose={() => setMenuBill(null)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuBill(null)}>
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle} numberOfLines={1}>
              Sale #{menuBill?.billNo} · {menuBill?.partyName}
            </Text>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                const no = menuBill.billNo
                setMenuBill(null)
                onEdit(no)
              }}
            >
              <Text style={styles.menuText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.menuItem} onPress={() => confirmDelete(menuBill)}>
              <Text style={[styles.menuText, styles.menuDanger]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {plusOpen && <Pressable style={StyleSheet.absoluteFill} onPress={() => setPlus(false)} />}
      {plusOpen && (
        <Animated.View
          style={[
            styles.plusMenu,
            {
              left: plusCenter - MENU_W / 2,
              width: MENU_W,
              opacity: pop,
              transform: [
                { translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
                { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              ],
            },
          ]}
        >
          <Pressable style={styles.plusMenuItem} onPress={() => pick(onAlterParty)}>
            <Text style={styles.fabSecondaryText}>Alter Party</Text>
          </Pressable>
          <Pressable style={styles.plusMenuItem} onPress={() => pick(onAlterItem)}>
            <Text style={styles.fabSecondaryText}>Alter Items</Text>
          </Pressable>
        </Animated.View>
      )}

      <View style={styles.fabs} onLayout={(e) => setFabsBox({ x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}>
        <Pressable style={styles.fab} onPress={onAdd}>
          <Text style={styles.fabPlus}>+</Text>
          <Text style={styles.fabText}>Add Sale</Text>
        </Pressable>
        <Pressable
          style={styles.plusCircle}
          onPress={() => setPlus(!plusOpen)}
          onLayout={(e) => setPlusBox({ x: e.nativeEvent.layout.x, w: e.nativeEvent.layout.width })}
        >
          <Animated.Text
            style={[
              styles.plusCircleText,
              { transform: [{ rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] },
            ]}
          >
            +
          </Animated.Text>
        </Pressable>
        <Pressable style={styles.fabSecondary} onPress={onTransactions}>
          <Text style={styles.fabSecondaryText}>Transaction</Text>
        </Pressable>
      </View>
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.cardBg,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    headerIcon: { fontSize: 20, color: theme.ink },
    title: { flex: 1, fontSize: 22, color: theme.ink },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 15,
      color: theme.ink,
    },
    list: { padding: 14, gap: 14, paddingBottom: 120 },
    empty: { textAlign: 'center', color: theme.inkSoft, paddingVertical: 48 },
    card: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      elevation: 2,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    bottomRow: { alignItems: 'flex-end', marginTop: 8 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    party: { fontSize: 17, color: theme.ink, flexShrink: 1 },
    badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4 },
    amount: { fontSize: 20, fontWeight: '500', color: theme.ink, marginTop: 4 },
    right: { alignItems: 'flex-end' },
    rightText: { fontSize: 13, color: theme.inkSoft },
    meta: { fontSize: 14, color: theme.inkSoft, lineHeight: 21 },
    actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    action: { fontSize: 20, color: theme.ink },
    menuBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    menuCard: {
      width: '100%',
      maxWidth: 320,
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      overflow: 'hidden',
    },
    menuTitle: {
      fontSize: 13,
      color: theme.inkSoft,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    menuItem: { paddingHorizontal: 18, paddingVertical: 15 },
    menuText: { fontSize: 16, color: theme.ink },
    menuDanger: { color: theme.danger },
    fabs: {
      position: 'absolute',
      alignSelf: 'center',
      bottom: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#f0224f',
      borderRadius: 30,
      paddingVertical: 15,
      paddingHorizontal: 22,
      elevation: 8,
    },
    fabSecondary: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 30,
      paddingVertical: 15,
      paddingHorizontal: 16,
      elevation: 8,
    },
    fabSecondaryText: { color: theme.ink, fontSize: 16, fontWeight: '500' },
    plusCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      elevation: 8,
    },
    plusCircleText: { color: theme.ink, fontSize: 32, lineHeight: 36 },
    plusMenu: { position: 'absolute', bottom: 28 + 56 + 14, gap: 10, alignItems: 'stretch' },
    plusMenuItem: {
      alignItems: 'center',
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 30,
      paddingVertical: 14,
      elevation: 8,
    },
    fabPlus: { color: '#fff', fontSize: 26, lineHeight: 28 },
    fabText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  })
}
