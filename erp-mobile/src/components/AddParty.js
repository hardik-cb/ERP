import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import PageHeader, { pageTopPadding } from './PageHeader'
import { addParty } from '../db'
import { useTheme } from '../theme'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

export default function AddParty({ onBack, onDone }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cash, setCash] = useState('')
  const [metal, setMetal] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(cash)) return setError('Cash must be a number.')
    if (!isNumber(metal)) return setError('Metal must be a number.')
    setError('')
    setSaving(true)
    try {
      const party = await addParty({ name, description, cash, metal })
      Alert.alert('Party added', `"${party.name}" added.`)
      onDone()
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.root}>
      <PageHeader title="Add Party" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Field styles={styles} theme={theme} label="Name" value={name} onChangeText={setName} autoFocus />
        <Field styles={styles} theme={theme} label="Description" value={description} onChangeText={setDescription} />
        <Field styles={styles} theme={theme} label="Cash (Rs)" value={cash} onChangeText={setCash} numeric />
        <Field styles={styles} theme={theme} label="Metal (g)" value={metal} onChangeText={setMetal} numeric />
        <Text style={styles.hint}>Opening balance: positive means the party owes the shop, negative means the shop owes the party.</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'SAVING…' : 'SAVE'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

function Field({ styles, theme, label, numeric, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={theme.inkSoft}
        keyboardType={numeric ? 'numeric' : 'default'}
        autoCorrect={false}
        {...props}
      />
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg, paddingTop: pageTopPadding },
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
    hint: { fontSize: 12, color: theme.inkSoft },
    error: { fontSize: 13, color: theme.danger },
    saveBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    saveText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.accentInk },
  })
}
