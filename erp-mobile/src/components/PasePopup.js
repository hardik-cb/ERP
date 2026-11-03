import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { paseAmount } from '../calc'
import { LIVE_METAL_RATE } from '../data'
import { useTheme } from '../theme'

export default function PasePopup({ visible, totals, initial, onSave, onClose }) {
  const theme = useTheme()
  const [rate, setRate] = useState(initial?.rate ?? LIVE_METAL_RATE)
  const styles = makeStyles(theme)

  const { base, total } = paseAmount({ rate, weightTotal: totals.wt, labourTotal: totals.rs })

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.header}>PASE</Text>

          <View style={styles.row}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>Rs {round(totals.rs)}</Text>
            </View>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{round(totals.wt)}g</Text>
            </View>
          </View>

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

          <Text style={styles.note}>
            Rs {rate} x {round4(totals.wt / 1000)} = Rs {round(base)}
          </Text>

          <View style={styles.line}>
            <Text style={styles.lineLabel}>Labour</Text>
            <Text style={styles.lineValue}>Rs{round(totals.rs)}</Text>
          </View>

          <View style={styles.total}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{round(total)}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                onSave({ mode: 'pase', rate: Number(rate), amount: total })
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
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 10,
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
    note: {
      fontSize: 12,
      color: theme.inkSoft,
      textAlign: 'center',
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingTop: 8,
    },
    line: { flexDirection: 'row', justifyContent: 'space-between' },
    lineLabel: { fontSize: 12, color: theme.inkSoft },
    lineValue: { fontSize: 12, color: theme.inkSoft },
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
