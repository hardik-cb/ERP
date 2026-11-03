import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import PageHeader, { pageTopPadding } from './PageHeader'
import { getBill } from '../db'
import { buildEstimateHtml, savePdf, sharePdf } from '../estimate'
import { useTheme } from '../theme'

// Preview of the printed estimate, with Save (print dialog -> Save as PDF) and
// Share (PDF to WhatsApp etc.) in the top bar.
export default function Estimate({ billNo, onBack }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [bill, setBill] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getBill(billNo)
      .then(setBill)
      .catch((e) => Alert.alert('Could not open bill', String(e?.message || e)))
  }, [billNo])

  const html = useMemo(() => (bill ? buildEstimateHtml(bill, { preview: true }) : null), [bill])

  const run = async (action, failTitle) => {
    setBusy(true)
    try {
      await action(bill)
    } catch (e) {
      Alert.alert(failTitle, String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.bar}>
        <View style={styles.barTitle}>
          <PageHeader title={`Estimate · Sale #${billNo}`} onBack={onBack} />
        </View>
        <Pressable style={[styles.btn, styles.ghost, (!bill || busy) && styles.disabled]} disabled={!bill || busy} onPress={() => run(savePdf, 'Could not save')}>
          <Text style={styles.ghostText}>SAVE</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.primary, (!bill || busy) && styles.disabled]} disabled={!bill || busy} onPress={() => run(sharePdf, 'Could not share')}>
          <Text style={styles.primaryText}>SHARE</Text>
        </Pressable>
      </View>
      {html ? (
        <WebView originWhitelist={['*']} source={{ html }} style={styles.web} />
      ) : (
        <Text style={styles.loading}>Loading…</Text>
      )}
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
