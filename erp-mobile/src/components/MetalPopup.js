import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { metalRowNetWeight, metalSettlement } from '../calc'
import { LIVE_METAL_RATE } from '../data'
import { createId } from '../id'
import { useTheme } from '../theme'

export default function MetalPopup({ visible, totals, initial, onSave, onClose }) {
  const theme = useTheme()
  const [rate, setRate] = useState(initial?.rate ?? LIVE_METAL_RATE)
  const [rows, setRows] = useState(() => (initial?.rows?.length ? initial.rows : []))
  // Off by default: any metal shortfall or excess stays as a metal balance.
  const [bhavKatna, setBhavKatna] = useState(initial?.bhavKatna ?? false)
  // Grams of the metal difference to price at the rate. Bills saved before
  // this existed priced the whole difference, so that is what they reopen with.
  const [katnaWt, setKatnaWt] = useState(() => {
    if (initial?.katnaWt != null) return String(initial.katnaWt)
    if (!initial?.bhavKatna) return ''
    const full = metalSettlement({ rate: initial.rate, rows: initial.rows, weightTotal: totals.wt, bhavKatna: false })
    return String(Math.abs(full.delta))
  })
  const styles = makeStyles(theme)

  const addRow = () => setRows((r) => [...r, { id: createId('metalrow'), wt: '', tunch: '' }])
  const updateRow = (id, field, value) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  const removeRow = (id) => setRows((r) => r.filter((row) => row.id !== id))

  const result = metalSettlement({ rate, rows, weightTotal: totals.wt, labourTotal: totals.rs, bhavKatna, katnaWt })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.header}>METAL</Text>

          <View style={styles.row}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Rs {round(totals.rs)}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{round(totals.wt)}g</Text>
            </View>
          </View>

          {bhavKatna && (
            <View style={styles.row}>
              <View style={styles.chip}>
                <Text style={styles.chipText}>LIVE {LIVE_METAL_RATE}</Text>
              </View>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={String(rate)}
                onChangeText={setRate}
              />
            </View>
          )}

          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadText, styles.colWt]}>Wt</Text>
            <Text style={[styles.tableHeadText, styles.colQnt]}>Tunch</Text>
            <Text style={[styles.tableHeadText, styles.colNet]}>Nt wt</Text>
            <View style={styles.colRemove} />
          </View>

          {rows.map((row) => (
            <View style={styles.tableRow} key={row.id}>
              <TextInput
                style={[styles.rowInput, styles.colWt]}
                keyboardType="numeric"
                value={String(row.wt)}
                onChangeText={(t) => updateRow(row.id, 'wt', t)}
              />
              <TextInput
                style={[styles.rowInput, styles.colQnt]}
                keyboardType="numeric"
                value={String(row.tunch)}
                onChangeText={(t) => updateRow(row.id, 'tunch', t)}
              />
              <Text style={[styles.rowValue, styles.colNet]}>{round(metalRowNetWeight(row))}g</Text>
              <Pressable style={styles.colRemove} onPress={() => removeRow(row.id)} hitSlop={8}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}

          <Pressable style={styles.plusBtn} onPress={addRow}>
            <Text style={styles.plusBtnText}>+</Text>
          </Pressable>

          <View style={styles.line}>
            <Text style={styles.lineLabel}>Metal fine</Text>
            <Text style={styles.lineValue}>{round(result.metalFine)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lineLabel}>Payable fine</Text>
            <Text style={styles.lineValue}>-{round(totals.wt)}</Text>
          </View>

          <Pressable
            style={[styles.toggleBtn, bhavKatna && styles.toggleBtnActive]}
            onPress={() => setBhavKatna((v) => !v)}
          >
            <Text style={[styles.toggleText, bhavKatna && styles.toggleTextActive]}>Bhav katna</Text>
          </Pressable>

          {bhavKatna && (
            <>
              <View style={styles.row}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Katna wt (g)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={katnaWt}
                  placeholder={`up to ${round(Math.abs(result.delta))}`}
                  placeholderTextColor={theme.inkSoft}
                  onChangeText={setKatnaWt}
                />
              </View>
              <Text style={styles.note}>
                Rs {rate} x {round4(result.netPayableWeight / 1000)} = Rs {round(result.metalValue)}
              </Text>
            </>
          )}
          {result.metalBalance !== 0 && (
            <View style={styles.line}>
              <Text style={styles.lineLabel}>{result.metalBalance < 0 ? 'Metal we owe' : 'Metal balance'}</Text>
              <Text style={styles.lineValue}>
                {result.metalBalance > 0 ? '+' : ''}
                {round(result.metalBalance)}g
              </Text>
            </View>
          )}

          <View style={styles.line}>
            <Text style={styles.lineLabel}>Labour</Text>
            <Text style={styles.lineValue}>+{round(result.labour)}</Text>
          </View>

          <View style={styles.total}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{round(result.total)}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                onSave({
                  mode: 'metal',
                  rate: Number(rate),
                  rows,
                  bhavKatna,
                  katnaWt: bhavKatna ? Number(katnaWt) || 0 : undefined,
                  amount: result.total,
                  metalBalance: result.metalBalance,
                })
                onClose()
              }}
            >
              <Text style={styles.primaryBtnText}>SAVE</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function round(n) {
  return Math.round(Number(n) || 0)
}

function round4(n) {
  return Math.round((Number(n) || 0) * 10000) / 10000
}

function makeStyles(theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      maxHeight: '85%',
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    header: {
      fontWeight: '700',
      fontSize: 14,
      letterSpacing: 0.4,
      textAlign: 'center',
      color: theme.ink,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingBottom: 8,
    },
    row: { flexDirection: 'row', gap: 8 },
    chip: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      backgroundColor: theme.chipBg,
      alignItems: 'center',
    },
    chipText: { fontSize: 13, color: theme.ink },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 7,
      paddingHorizontal: 10,
      fontSize: 13,
      color: theme.ink,
    },
    tableHead: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    tableHeadText: { fontSize: 11, fontWeight: '700', color: theme.inkSoft, textTransform: 'uppercase' },
    colWt: { flex: 1 },
    colQnt: { flex: 1 },
    colNet: { flex: 1 },
    colRemove: { width: 20 },
    tableRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    rowInput: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 6,
      paddingVertical: 5,
      paddingHorizontal: 6,
      fontSize: 12,
      color: theme.ink,
    },
    rowValue: { fontSize: 12, color: theme.ink },
    removeText: { fontSize: 14, color: theme.inkSoft },
    plusBtn: {
      alignSelf: 'center',
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plusBtnText: { fontSize: 16, color: theme.ink },
    toggleBtn: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 9,
      alignItems: 'center',
    },
    toggleBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    toggleText: { fontSize: 14, color: theme.ink },
    toggleTextActive: { color: theme.accentInk, fontWeight: '600' },
    line: { flexDirection: 'row', justifyContent: 'space-between' },
    lineLabel: { fontSize: 12, color: theme.inkSoft },
    lineValue: { fontSize: 12, color: theme.inkSoft },
    note: {
      fontSize: 12,
      color: theme.inkSoft,
      textAlign: 'center',
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingTop: 8,
      paddingBottom: 2,
    },
    total: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      backgroundColor: theme.chipBg,
    },
    totalLabel: { fontSize: 14, fontWeight: '700', color: theme.ink },
    totalValue: { fontSize: 14, fontWeight: '700', color: theme.ink },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    ghostBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    ghostBtnText: { fontSize: 13, fontWeight: '600', color: theme.ink },
    primaryBtn: {
      flex: 1,
      backgroundColor: theme.accent,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    primaryBtnText: { fontSize: 13, fontWeight: '700', color: theme.accentInk },
  })
}
