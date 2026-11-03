import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import PageHeader, { pageTopPadding } from './PageHeader'
import { deleteItem, updateItem } from '../db'
import { useTheme } from '../theme'

const isNumber = (v) => v === '' || Number.isFinite(Number(v))

// An item opened from Alter Items: read-only with Edit and Delete.
export default function ItemDetail({ item, onBack, onDone }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [mode, setMode] = useState('view') // view | edit
  const [name, setName] = useState(item.name)
  const [description, setDescription] = useState(item.description)
  const [pct, setPct] = useState(String(item.pct))
  const [rate, setRate] = useState(item.rate == null ? '' : String(item.rate))
  const [rateMode, setRateMode] = useState(item.rateMode)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const readOnly = mode === 'view'

  const save = async () => {
    if (!name.trim()) return setError('Name is required.')
    if (!isNumber(pct)) return setError('Percentage must be a number.')
    if (!isNumber(rate)) return setError('Rate must be a number.')
    setError('')
    setSaving(true)
    try {
      await updateItem(item.id, { name, description, pct, rate, rateMode })
      onDone()
    } catch (e) {
      setError(String(e?.message || e))
      setSaving(false)
    }
  }

  const remove = () =>
    Alert.alert(
      `Delete ${item.name}?`,
      'Warning: the item is removed from the item list. Sales already made keep their item lines. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true)
            try {
              await deleteItem(item.id)
              onDone()
            } catch (e) {
              setSaving(false)
              setError(String(e?.message || e))
            }
          },
        },
      ]
    )

  const field = (label, value, set, opts = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, readOnly && styles.readonly]}
        value={value}
        onChangeText={set}
        editable={!readOnly}
        autoCorrect={false}
        placeholderTextColor={theme.inkSoft}
        {...opts}
      />
    </View>
  )

  return (
    <View style={styles.root}>
      <PageHeader title={readOnly ? item.name : `Edit ${item.name}`} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {field('Name', name, setName)}
        {field('Description', description, setDescription)}
        {field('Percentage (%)', pct, setPct, { keyboardType: 'numeric', placeholder: '100' })}
        {field('Labour rate (Rs)', rate, setRate, { keyboardType: 'numeric' })}
        <View style={styles.toggleRow}>
          {[
            ['weight', 'Per kg'],
            ['piece', 'Per piece'],
          ].map(([m, label]) => (
            <Pressable
              key={m}
              style={[styles.toggleBtn, rateMode === m && styles.toggleBtnActive]}
              disabled={readOnly}
              onPress={() => setRateMode(m)}
            >
              <Text style={[styles.toggleText, rateMode === m && styles.toggleTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
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
            <Pressable style={[styles.ghost, saving && styles.disabled]} disabled={saving} onPress={onBack}>
              <Text style={styles.ghostText}>CANCEL</Text>
            </Pressable>
            <Pressable style={[styles.primary, styles.flex, saving && styles.disabled]} onPress={save} disabled={saving}>
              <Text style={styles.primaryText}>{saving ? 'SAVING…' : 'SAVE CHANGES'}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg, paddingTop: pageTopPadding },
    flex: { flex: 1 },
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
    toggleRow: { flexDirection: 'row', gap: 10 },
    toggleBtn: { flex: 1, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
    toggleBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    toggleText: { fontSize: 14, color: theme.ink },
    toggleTextActive: { color: theme.accentInk, fontWeight: '600' },
    error: { fontSize: 13, color: theme.danger },
    actions: { flexDirection: 'row', gap: 10 },
    primary: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    primaryText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.accentInk },
    danger: { borderWidth: 1, borderColor: theme.danger, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    dangerText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.danger },
    ghost: { borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 22, alignItems: 'center' },
    ghostText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, color: theme.ink },
    disabled: { opacity: 0.6 },
  })
}
