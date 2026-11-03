import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import PageHeader, { pageTopPadding } from './PageHeader'
import EditLog from './EditLog'
import { addTransaction, deleteTransaction, getTransaction, getTransactionLog, updateTransaction } from '../db'
import { useTheme } from '../theme'

const isNumber = (v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0)

// direction 'in': the party pays or hands over, so their balance is deducted.
// direction 'out': the shop pays or hands over, so it is added to their balance.
// With txnId it opens that saved transaction read-only, with Edit and Delete.
export default function TransactionForm({ direction, party, txnId, onBack, onDone }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [mode, setMode] = useState(txnId ? 'view' : 'new') // new | view | edit
  const [loading, setLoading] = useState(Boolean(txnId))
  const [cash, setCash] = useState('')
  const [metal, setMetal] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isIn = direction === 'in'
  const readOnly = mode === 'view'
  const [editLog, setEditLog] = useState([])
  const title = isIn ? 'Transaction In' : 'Transaction Out'

  const load = async () => {
    const t = await getTransaction(txnId)
    setCash(t.cash ? String(t.cash) : '')
    setMetal(t.metal ? String(t.metal) : '')
  }

  useEffect(() => {
    if (!txnId) return
    load()
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [])

  // Edit trail under an opened transaction; refreshed whenever the view is shown again.
  useEffect(() => {
    if (txnId && mode === 'view') getTransactionLog(txnId).then(setEditLog).catch(() => {})
  }, [txnId, mode])

  const save = async () => {
    if (!isNumber(cash) || !isNumber(metal)) return setError('Enter positive numbers only.')
    if (!Number(cash) && !Number(metal)) return setError('Enter a cash or metal amount.')
    setError('')
    setSaving(true)
    try {
      if (mode === 'edit') {
        await updateTransaction(txnId, { cash, metal })
        Alert.alert(title, 'Updated.')
      } else {
        await addTransaction({ partyId: party.id, direction, cash, metal })
        Alert.alert(title, 'Saved.')
      }
      onDone()
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = () => {
    const what = [Number(cash) && `Rs ${cash}`, Number(metal) && `${metal}g`].filter(Boolean).join(' and ')
    const effect = isIn ? 'added back to what they owe' : 'deducted from what they owe'
    Alert.alert(
      `Delete ${title}?`,
      `${what} for ${party.name}\n\nWarning: ${what} will be ${effect}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true)
            try {
              await deleteTransaction(txnId)
              onDone()
            } catch (e) {
              setSaving(false)
              setError(String(e?.message || e))
            }
          },
        },
      ]
    )
  }

  const cancelEdit = async () => {
    setError('')
    await load()
    setMode('view')
  }

  return (
    <View style={styles.root}>
      <PageHeader title={title} onBack={onBack} />
      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Party name</Text>
            <TextInput style={[styles.input, styles.readonly]} value={party.name} editable={false} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Cash (Rs)</Text>
            <TextInput
              style={[styles.input, readOnly && styles.readonly]}
              keyboardType="numeric"
              value={cash}
              onChangeText={setCash}
              editable={!readOnly}
              autoFocus={mode === 'new'}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Metal (g)</Text>
            <TextInput
              style={[styles.input, readOnly && styles.readonly]}
              keyboardType="numeric"
              value={metal}
              onChangeText={setMetal}
              editable={!readOnly}
            />
          </View>
          {!readOnly && (
            <Text style={styles.hint}>
              {isIn
                ? 'Received from the party: the amounts are deducted from what they owe.'
                : 'Given to the party: the amounts are added to what they owe.'}
            </Text>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}

          {mode === 'view' ? (
            <View style={styles.actions}>
              <Pressable style={[styles.primary, styles.flex]} onPress={() => setMode('edit')}>
                <Text style={styles.primaryText}>EDIT</Text>
              </Pressable>
              <Pressable style={[styles.danger, styles.flex, saving && styles.disabled]} onPress={confirmDelete} disabled={saving}>
                <Text style={styles.dangerText}>DELETE</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              {mode === 'edit' && (
                <Pressable style={[styles.ghost, saving && styles.disabled]} onPress={cancelEdit} disabled={saving}>
                  <Text style={styles.ghostText}>CANCEL</Text>
                </Pressable>
              )}
              <Pressable style={[styles.primary, styles.flex, saving && styles.disabled]} onPress={save} disabled={saving}>
                <Text style={styles.primaryText}>{saving ? 'SAVING…' : mode === 'edit' ? 'SAVE CHANGES' : 'SAVE'}</Text>
              </Pressable>
            </View>
          )}

          {mode === 'view' && <EditLog entries={editLog} />}
        </ScrollView>
      )}
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg, paddingTop: pageTopPadding },
    flex: { flex: 1 },
    loading: { textAlign: 'center', color: theme.inkSoft, paddingVertical: 60 },
    body: { padding: 16, gap: 14 },
    field: { gap: 6 },
    label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: theme.inkSoft, textTransform: 'uppercase' },
    input: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 16,
      color: theme.ink,
    },
    readonly: { opacity: 0.7 },
    hint: { fontSize: 12, color: theme.inkSoft },
    error: { fontSize: 13, color: theme.danger },
    actions: { flexDirection: 'row', gap: 10 },
    primary: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    primaryText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.accentInk },
    danger: { borderWidth: 1, borderColor: theme.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    dangerText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.danger },
    ghost: {
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 22,
      alignItems: 'center',
    },
    ghostText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.ink },
    disabled: { opacity: 0.6 },
  })
}
