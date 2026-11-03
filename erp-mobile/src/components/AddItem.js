import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import PageHeader, { pageTopPadding } from './PageHeader'
import { addItem } from '../db'
import { useTheme } from '../theme'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

export default function AddItem({ onBack, onDone }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pct, setPct] = useState('')
  const [rate, setRate] = useState('')
  const [rateMode, setRateMode] = useState('weight')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(pct)) return setError('Percentage must be a number.')
    if (!isNumber(rate)) return setError('Rate must be a number.')
    setError('')
    setSaving(true)
    try {
      const item = await addItem({ name, description, pct, rate, rateMode })
      Alert.alert('Item added', `"${item.name}" added.`)
      onDone()
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const input = (props) => (
    <TextInput style={styles.input} placeholderTextColor={theme.inkSoft} autoCorrect={false} {...props} />
  )

  return (
    <View style={styles.root}>
      <PageHeader title="Add Items" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          {input({ value: name, onChangeText: setName, autoFocus: true })}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          {input({ value: description, onChangeText: setDescription })}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Percentage (%)</Text>
          {input({ value: pct, onChangeText: setPct, keyboardType: 'numeric', placeholder: '100' })}
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Labour rate (Rs)</Text>
          {input({ value: rate, onChangeText: setRate, keyboardType: 'numeric' })}
        </View>
        <View style={styles.toggleRow}>
          {[
            ['weight', 'Per kg'],
            ['piece', 'Per piece'],
          ].map(([mode, label]) => (
            <Pressable
              key={mode}
              style={[styles.toggleBtn, rateMode === mode && styles.toggleBtnActive]}
              onPress={() => setRateMode(mode)}
            >
              <Text style={[styles.toggleText, rateMode === mode && styles.toggleTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>The percentage and rate fill in automatically when this item is added to a sale.</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          <Text style={styles.saveText}>{saving ? 'SAVING…' : 'SAVE'}</Text>
        </Pressable>
      </ScrollView>
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
    toggleRow: { flexDirection: 'row', gap: 10 },
    toggleBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    toggleBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    toggleText: { fontSize: 14, color: theme.ink },
    toggleTextActive: { color: theme.accentInk, fontWeight: '600' },
    hint: { fontSize: 12, color: theme.inkSoft },
    error: { fontSize: 13, color: theme.danger },
    saveBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    disabled: { opacity: 0.6 },
    saveText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.accentInk },
  })
}
