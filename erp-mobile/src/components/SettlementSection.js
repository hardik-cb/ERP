import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../theme'

export default function SettlementSection({
  settlement,
  received,
  onReceivedChange,
  onOpenPase,
  onOpenMetal,
  onReopenSettlement,
  onClearSettlement,
  readOnly,
  totalWeight,
}) {
  const theme = useTheme()
  const styles = makeStyles(theme)

  const due = settlement?.amount ?? 0
  const receivedNum = Number(received) || 0
  const balance = due - receivedNum
  // Metal still owed (grams, signed): the whole bill weight when nothing was
  // settled, or the unpriced difference of a Metal settlement.
  const metalBalance = settlement ? (settlement.metalBalance ?? 0) : (totalWeight ?? 0)

  return (
    <View style={styles.section}>
      {settlement ? (
        <View style={styles.applied}>
          <Pressable style={styles.appliedMain} onPress={onReopenSettlement} disabled={readOnly}>
            <Text style={styles.appliedLabel}>{settlement.mode === 'pase' ? 'PASE' : 'METAL'}</Text>
            <Text style={styles.appliedAmount}>Rs {round(settlement.amount)}</Text>
          </Pressable>
          {!readOnly && (
            <Pressable style={styles.clearBtn} onPress={onClearSettlement}>
              <Text style={styles.clearBtnText}>×</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.buttons}>
          <Pressable style={[styles.ghostBtn, readOnly && styles.dimmed]} onPress={onOpenPase} disabled={readOnly}>
            <Text style={styles.ghostBtnText}>Pase</Text>
          </Pressable>
          <Pressable style={[styles.ghostBtn, readOnly && styles.dimmed]} onPress={onOpenMetal} disabled={readOnly}>
            <Text style={styles.ghostBtnText}>Metal</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Received</Text>
        <TextInput
          style={styles.receivedInput}
          keyboardType="numeric"
          value={String(received)}
          onChangeText={onReceivedChange}
          editable={!readOnly}
        />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Total</Text>
          <Text style={styles.summaryText}>{round(due)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Received</Text>
          <Text style={styles.summaryText}>{round(receivedNum)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.balanceRow]}>
          <Text style={styles.balanceText}>Balance</Text>
          <Text style={styles.balanceText}>Rs {round(balance)}</Text>
        </View>
        {metalBalance !== 0 && (
          <View style={[styles.summaryRow, styles.balanceRow]}>
            <Text style={styles.balanceText}>{metalBalance < 0 ? 'Metal we owe' : 'Metal balance'}</Text>
            <Text style={styles.balanceText}>{round(metalBalance)}g</Text>
          </View>
        )}
      </View>
    </View>
  )
}

function round(n) {
  return Math.round(Number(n) || 0)
}

function makeStyles(theme) {
  return StyleSheet.create({
    section: { gap: 10 },
    dimmed: { opacity: 0.55 },
    buttons: { flexDirection: 'row', gap: 10 },
    ghostBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    ghostBtnText: { fontSize: 13, fontWeight: '600', color: theme.ink },
    applied: { flexDirection: 'row', gap: 8 },
    appliedMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: theme.chipBg,
    },
    appliedLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: theme.inkSoft },
    appliedAmount: { fontSize: 14, fontWeight: '700', color: theme.ink },
    clearBtn: {
      width: 40,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearBtnText: { fontSize: 16, color: theme.inkSoft },
    fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
      color: theme.inkSoft,
      textTransform: 'uppercase',
    },
    receivedInput: {
      flex: 1,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 14,
      fontSize: 15,
      color: theme.ink,
    },
    summary: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      gap: 4,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryText: { fontSize: 13, color: theme.inkSoft },
    balanceRow: {
      borderTopWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingTop: 4,
      marginTop: 2,
    },
    balanceText: { fontSize: 13, fontWeight: '700', color: theme.ink },
  })
}
