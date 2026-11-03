import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme'
import { fmtClock, fmtDMY, gramsText, money } from '../txn'

const amounts = (cash, metal) => `Rs ${money(cash)} · ${gramsText(metal)}`

// What one log entry says. Sale entries carry `received`; transactions don't.
function describe(e) {
  const sale = e.received != null
  const now = sale
    ? `Rs ${money(e.cash)} billed · Rs ${money(e.received)} received · ${gramsText(e.metal)} metal`
    : amounts(e.cash, e.metal)
  if (e.kind === 'created') return now
  const was = sale ? `Previous entry reversed (${amounts(e.previous.cash, e.previous.metal)})` : `Changed from ${amounts(e.previous.cash, e.previous.metal)}`
  return `${was} → now ${now}`
}

// Edit trail shown at the bottom of an opened sale or transaction. It is part of
// the on-screen view only and is never printed.
export default function EditLog({ entries }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  if (!entries || entries.length === 0) return null
  return (
    <View style={styles.box}>
      <Text style={styles.title}>EDIT LOG</Text>
      {entries.map((e, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.head}>
            <Text style={styles.kind}>{e.kind === 'created' ? 'Created' : 'Edited'}</Text>
            <Text style={styles.when}>
              {fmtDMY(e.ts)} {fmtClock(e.ts)}
            </Text>
          </View>
          <Text style={styles.text}>{describe(e)}</Text>
        </View>
      ))}
      {entries.length === 1 && <Text style={styles.when}>Not edited since it was created.</Text>}
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    box: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed', borderColor: theme.borderStrong, gap: 10 },
    title: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: theme.inkSoft },
    row: { gap: 2 },
    head: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    kind: { fontSize: 13, fontWeight: '700', color: theme.ink },
    when: { fontSize: 12, color: theme.inkSoft },
    text: { fontSize: 13, color: theme.inkSoft },
  })
}
