import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { createId } from '../id'
import { useTheme } from '../theme'

export default function PackagingPopup({ visible, initial, onSave, onClose }) {
  const theme = useTheme()
  const [rows, setRows] = useState(() => (initial && initial.length ? initial : []))
  const styles = makeStyles(theme)

  const addRow = () => setRows((r) => [...r, { id: createId('pkgrow'), wtG: '', qnt: '' }])
  const updateRow = (id, field, value) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  const removeRow = (id) => setRows((r) => r.filter((row) => row.id !== id))

  const totalWt = rows.reduce((sum, row) => sum + (Number(row.wtG) || 0) * (Number(row.qnt) || 0), 0)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.header}>ADD PACKAGING</Text>

          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadText, styles.colWt]}>wt(g)</Text>
            <Text style={[styles.tableHeadText, styles.colQnt]}>qnt</Text>
            <Text style={[styles.tableHeadText, styles.colNet]}>Net wt</Text>
            <View style={styles.colRemove} />
          </View>

          {rows.map((row) => (
            <View style={styles.tableRow} key={row.id}>
              <TextInput
                style={[styles.rowInput, styles.colWt]}
                keyboardType="numeric"
                value={String(row.wtG)}
                onChangeText={(t) => updateRow(row.id, 'wtG', t)}
              />
              <TextInput
                style={[styles.rowInput, styles.colQnt]}
                keyboardType="numeric"
                value={String(row.qnt)}
                onChangeText={(t) => updateRow(row.id, 'qnt', t)}
              />
              <Text style={[styles.rowValue, styles.colNet]}>
                {(Number(row.wtG) || 0) * (Number(row.qnt) || 0)}g
              </Text>
              <Pressable style={styles.colRemove} onPress={() => removeRow(row.id)} hitSlop={8}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}

          <Pressable style={styles.plusBtn} onPress={addRow}>
            <Text style={styles.plusBtnText}>+</Text>
          </Pressable>

          <Text style={styles.note}>Total packaging: {totalWt}g</Text>

          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                onSave(rows)
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
      marginBottom: 2,
    },
    tableHead: { flexDirection: 'row', alignItems: 'center' },
    tableHeadText: {
      fontSize: 11,
      fontWeight: '700',
      color: theme.inkSoft,
      textTransform: 'uppercase',
    },
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
      marginTop: 4,
    },
    plusBtnText: { fontSize: 16, color: theme.ink },
    note: {
      fontSize: 12,
      color: theme.inkSoft,
      textAlign: 'center',
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingTop: 8,
    },
    actions: { flexDirection: 'row', gap: 8 },
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
