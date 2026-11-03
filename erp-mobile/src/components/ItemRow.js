import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { itemTotals } from '../calc'
import { useTheme } from '../theme'

export default function ItemRow({ item, index, onChange, onOpenLabour, onOpenPackaging, onRemove, readOnly }) {
  const theme = useTheme()
  const totals = itemTotals(item)
  const styles = makeStyles(theme)

  const update = (field, value) => onChange({ ...item, [field]: value })

  return (
    <View style={styles.row}>
      <View style={styles.mainRow}>
        <Text style={styles.nameCell} numberOfLines={1}>
          {index + 1}. {item.name}
        </Text>

        <TextInput
          style={styles.cell}
          keyboardType="numeric"
          value={String(item.qty)}
          onChangeText={(t) => update('qty', t)}
          editable={!readOnly}
        />
        <Text style={styles.cellReadonly}>{round(totals.netWt)}g</Text>
        <TextInput
          style={styles.cellNarrow}
          keyboardType="numeric"
          value={String(item.pct)}
          onChangeText={(t) => update('pct', t)}
          editable={!readOnly}
        />
        {readOnly ? (
          <View style={styles.removeSpacer} />
        ) : (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Text style={styles.removeText}>×</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.subRow}>
        <View style={styles.actionsLeft}>
          <Pressable style={styles.packBtn} onPress={onOpenPackaging} disabled={readOnly}>
            <Text style={styles.packBtnText}>
              {totals.packWt > 0 ? `${round(totals.packWt)}g` : '📦'}
            </Text>
          </Pressable>
          <Pressable style={styles.labourBtn} onPress={onOpenLabour} disabled={readOnly}>
            <Text style={styles.labourBtnText}>
              {item.labour
                ? item.labour.mode === 'piece'
                  ? `Rs${item.labour.rate || 0} x ${item.labour.qty || 0}pc`
                  : `Rs${item.labour.ratePerKg || 0}/kg`
                : 'ADD LABOUR'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.netGroup}>
          {item.labour && (
            <View style={styles.labourAmount}>
              <Text style={styles.labourAmountText}>Rs{round(totals.labour)}</Text>
            </View>
          )}
          <Text style={styles.netWtFinal}>{round(totals.finalNetWt)}g</Text>
        </View>
      </View>
    </View>
  )
}

function round(n) {
  return Math.round(Number(n) || 0)
}

function makeStyles(theme) {
  return StyleSheet.create({
    row: {
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingBottom: 10,
      gap: 6,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    nameCell: { flex: 1, fontSize: 13, color: theme.ink },
    cell: {
      width: 52,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 4,
      fontSize: 13,
      textAlign: 'center',
      color: theme.ink,
    },
    cellNarrow: {
      width: 44,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 2,
      fontSize: 13,
      textAlign: 'center',
      color: theme.ink,
    },
    cellReadonly: {
      width: 52,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      borderRadius: 8,
      paddingVertical: 5,
      fontSize: 13,
      textAlign: 'center',
      color: theme.inkSoft,
    },
    removeSpacer: { width: 21 },
    removeText: { fontSize: 17, color: theme.inkSoft, paddingHorizontal: 2 },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    actionsLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    packBtn: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: theme.chipBg,
    },
    packBtnText: { fontSize: 12, color: theme.ink },
    labourBtn: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    labourBtnText: { fontSize: 12, color: theme.ink },
    netGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    labourAmount: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 10,
      backgroundColor: theme.chipBg,
    },
    labourAmountText: { fontSize: 12, fontWeight: '600', color: theme.ink },
    netWtFinal: {
      fontSize: 12,
      color: theme.inkSoft,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      borderRadius: 8,
      paddingVertical: 5,
      paddingHorizontal: 10,
    },
  })
}
