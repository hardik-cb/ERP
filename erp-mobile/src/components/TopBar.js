import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useTheme } from '../theme'

function formatDateDMY(d) {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatTime12h(d) {
  let h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function TopBar({ readOnly, onBack, onPrint, invoiceNo, date, onDateChange, time, onTimeChange }) {
  const theme = useTheme()
  const [showDate, setShowDate] = useState(false)
  const [showTime, setShowTime] = useState(false)
  const styles = makeStyles(theme)

  return (
    <View style={styles.topbar}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} hitSlop={8} onPress={onBack}>
          <Text style={styles.iconText}>←</Text>
        </Pressable>
        <Text style={styles.title}>Sale</Text>
        <View style={styles.headerActions}>
          {onPrint && (
            <Pressable style={styles.iconBtn} hitSlop={8} onPress={onPrint}>
              <Text style={styles.iconText}>🖨</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Invoice No.</Text>
          <View style={styles.fieldValueRow}>
            <Text style={styles.fieldValue}>{invoiceNo}</Text>
            <Text style={styles.chevron}> ⌄</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Date</Text>
          <Pressable style={styles.fieldValueRow} onPress={() => setShowDate(true)} disabled={readOnly}>
            <Text style={styles.fieldValue}>{formatDateDMY(date)}</Text>
            <Text style={styles.chevron}> ⌄</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Time</Text>
          <Pressable style={styles.fieldValueRow} onPress={() => setShowTime(true)} disabled={readOnly}>
            <Text style={styles.fieldValue}>{formatTime12h(time)}</Text>
            <Text style={styles.chevron}> ⌄</Text>
          </Pressable>
        </View>
      </View>

      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setShowDate(false)
            if (event.type === 'set' && selected) onDateChange(selected)
          }}
        />
      )}

      {showTime && (
        <DateTimePicker
          value={time}
          mode="time"
          display="default"
          onChange={(event, selected) => {
            setShowTime(false)
            if (event.type === 'set' && selected) onTimeChange(selected)
          }}
        />
      )}
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    topbar: { backgroundColor: theme.cardBg, borderBottomWidth: 1, borderColor: theme.border },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    title: { fontSize: 20, fontWeight: '700', flex: 1, color: theme.ink },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    iconText: { fontSize: 18, color: theme.ink },
    info: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    field: { gap: 2 },
    fieldLabel: { fontSize: 12, color: theme.inkSoft },
    fieldValueRow: { flexDirection: 'row', alignItems: 'center' },
    fieldValue: { fontSize: 15, fontWeight: '600', color: theme.ink },
    chevron: { color: theme.inkSoft, fontSize: 13 },
    divider: { width: 1, backgroundColor: theme.border },
  })
}
