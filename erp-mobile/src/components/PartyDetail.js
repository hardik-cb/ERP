import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import PageHeader, { pageTopPadding } from './PageHeader'
import { deleteParty, getParty, updateParty } from '../db'
import { useTheme } from '../theme'
import { gramsText, money, sideText } from '../txn'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

// A party opened from Alter Party: read-only with Edit and Delete; Edit changes
// the name, description and the opening cash and metal.
export default function PartyDetail({ partyId, onBack, onDone }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [mode, setMode] = useState('view') // view | edit
  const [loading, setLoading] = useState(true)
  const [info, setInfo] = useState(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cash, setCash] = useState('')
  const [metal, setMetal] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const readOnly = mode === 'view'

  const load = async () => {
    const p = await getParty(partyId)
    setInfo(p)
    setName(p.name)
    setDescription(p.description)
    setCash(p.openingCash ? String(p.openingCash) : '')
    setMetal(p.openingMetal ? String(p.openingMetal) : '')
  }

  useEffect(() => {
    load()
      .catch((e) => setError(String(e?.message || e)))
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(cash) || !isNumber(metal)) return setError('Cash and metal must be numbers.')
    setError('')
    setSaving(true)
    try {
      await updateParty(partyId, { name, description, openingCash: cash, openingMetal: metal })
      await load()
      setMode('view')
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const remove = () => {
    if (info.bills || info.txns) {
      const parts = [info.bills && `${info.bills} sale${info.bills > 1 ? 's' : ''}`, info.txns && `${info.txns} transaction${info.txns > 1 ? 's' : ''}`].filter(Boolean)
      return setError(`This party still has ${parts.join(' and ')}. Delete ${parts.length > 1 ? 'those' : 'it'} first.`)
    }
    Alert.alert(
      `Delete ${info.name}?`,
      'Warning: the party and its opening balance are removed from the lists. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true)
            try {
              await deleteParty(partyId)
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

  const field = (label, value, set, opts = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, readOnly && styles.readonly]}
        value={value}
        onChangeText={set}
        editable={!readOnly}
        autoCorrect={false}
        {...opts}
      />
    </View>
  )

  return (
    <View style={styles.root}>
      <PageHeader title={info ? (readOnly ? info.name : `Edit ${info.name}`) : 'Party'} onBack={onBack} />
      {loading ? (
        <Text style={styles.loading}>{error || 'Loading…'}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {field('Name', name, setName)}
          {field('Description', description, setDescription)}
          {field('Opening cash (Rs)', cash, setCash, { keyboardType: 'numeric' })}
          {field('Opening metal (g)', metal, setMetal, { keyboardType: 'numeric' })}
          <Text style={styles.hint}>
            {readOnly
              ? `Current balance: Rs ${money(info.cash)} (${sideText(info.cash)}) · ${gramsText(info.metal)} (${sideText(info.metal)})`
              : 'Changing the opening balance changes the current balance by the same amount.'}
          </Text>
          {!!error && <Text style={styles.error}>{error}</Text>}

          {readOnly ? (
            <View style={styles.actions}>
              <Pressable style={[styles.primary, styles.flex]} onPress={() => setMode('edit')}>
                <Text style={styles.primaryText}>EDIT</Text>
              </Pressable>
              <Pressable style={[styles.danger, styles.flex, saving && styles.disabled]} onPress={remove} disabled={saving}>
                <Text style={styles.dangerText}>DELETE</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable
                style={[styles.ghost, saving && styles.disabled]}
                disabled={saving}
                onPress={async () => {
                  setError('')
                  await load()
                  setMode('view')
                }}
              >
                <Text style={styles.ghostText}>CANCEL</Text>
              </Pressable>
              <Pressable style={[styles.primary, styles.flex, saving && styles.disabled]} onPress={save} disabled={saving}>
                <Text style={styles.primaryText}>{saving ? 'SAVING…' : 'SAVE CHANGES'}</Text>
              </Pressable>
            </View>
          )}
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
