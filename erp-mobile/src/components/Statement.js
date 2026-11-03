import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import PageHeader, { pageTopPadding } from './PageHeader'
import { getBalances, getStatement } from '../db'
import { buildStatementHtml, saveStatement, shareStatement } from '../statement'
import { useTheme } from '../theme'

const dayStart = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() : undefined)
const dayEnd = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime() : undefined)

// Preview of the statement for the Transactions screen's current filter (party
// and date range), with Save (print dialog -> Save as PDF) and Share.
export default function Statement({ party, range, onBack }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const from = dayStart(range.from)
    const to = dayEnd(range.to)
    Promise.all([getStatement({ partyId: party?.id, from, to }), getBalances({ partyId: party?.id })])
      .then(([items, balances]) => setData({ items, balances, party, from, to }))
      .catch((e) => Alert.alert('Could not open statement', String(e?.message || e)))
  }, [])

  const html = useMemo(() => (data ? buildStatementHtml(data, { preview: true }) : null), [data])

  const run = async (action, failTitle) => {
    setBusy(true)
    try {
      await action(data)
    } catch (e) {
      Alert.alert(failTitle, String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  const disabled = !data || busy
  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <View style={styles.barTitle}>
          <PageHeader title="Statement" onBack={onBack} />
        </View>
        <Pressable style={[styles.btn, styles.ghost, disabled && styles.disabled]} disabled={disabled} onPress={() => run(saveStatement, 'Could not save')}>
          <Text style={styles.ghostText}>SAVE</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.primary, disabled && styles.disabled]} disabled={disabled} onPress={() => run(shareStatement, 'Could not share')}>
          <Text style={styles.primaryText}>SHARE</Text>
        </Pressable>
      </View>
      {html ? <WebView originWhitelist={['*']} source={{ html }} style={styles.web} /> : <Text style={styles.loading}>Loading…</Text>}
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg, paddingTop: pageTopPadding },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: 12,
      backgroundColor: theme.cardBg,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    barTitle: { flex: 1 },
    btn: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18 },
    ghost: { borderWidth: 1, borderColor: theme.borderStrong },
    ghostText: { fontSize: 13, fontWeight: '700', color: theme.ink },
    primary: { backgroundColor: theme.accent },
    primaryText: { fontSize: 13, fontWeight: '700', color: theme.accentInk },
    disabled: { opacity: 0.5 },
    web: { flex: 1, backgroundColor: '#fff' },
    loading: { textAlign: 'center', color: theme.inkSoft, paddingVertical: 60 },
  })
}
