import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../theme'

const DEFAULT_LABOUR = { mode: 'weight', rate: '', qty: '', ratePerKg: '' }

export default function LabourPopup({ visible, initial, onSave, onClose }) {
  const theme = useTheme()
  const [labour, setLabour] = useState({ ...DEFAULT_LABOUR, ...initial })
  const styles = makeStyles(theme)

  const setMode = (mode) => setLabour((l) => ({ ...l, mode }))
  const update = (field, value) => setLabour((l) => ({ ...l, [field]: value }))

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.header}>LABOUR CHARGE</Text>

          <View style={styles.row}>
            <TextInput
              style={[styles.input, labour.mode !== 'piece' && styles.inputDisabled]}
              placeholder="Rs"
              placeholderTextColor={theme.inkSoft}
              keyboardType="numeric"
              editable={labour.mode === 'piece'}
              value={String(labour.rate)}
              onChangeText={(t) => update('rate', t)}
            />
            <TextInput
              style={[styles.input, labour.mode !== 'piece' && styles.inputDisabled]}
              placeholder="pc"
              placeholderTextColor={theme.inkSoft}
              keyboardType="numeric"
              editable={labour.mode === 'piece'}
              value={String(labour.qty)}
              onChangeText={(t) => update('qty', t)}
            />
          </View>

          <TextInput
            style={[styles.input, styles.inputWide, labour.mode !== 'weight' && styles.inputDisabled]}
            placeholder="Rs per Kg"
            placeholderTextColor={theme.inkSoft}
            keyboardType="numeric"
            editable={labour.mode === 'weight'}
            value={String(labour.ratePerKg)}
            onChangeText={(t) => update('ratePerKg', t)}
          />

          <View style={styles.row}>
            <Pressable
              style={[styles.toggleBtn, labour.mode === 'piece' && styles.toggleBtnActive]}
              onPress={() => setMode('piece')}
            >
              <Text style={[styles.toggleText, labour.mode === 'piece' && styles.toggleTextActive]}>Piece</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleBtn, labour.mode === 'weight' && styles.toggleBtnActive]}
              onPress={() => setMode('weight')}
            >
              <Text style={[styles.toggleText, labour.mode === 'weight' && styles.toggleTextActive]}>Weight</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.ghostBtn} onPress={onClose}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => {
                onSave(labour)
                onClose()
              }}
            >
              <Text style={styles.primaryBtnText}>SAVE</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      padding: 16,
      gap: 10,
    },
    header: {
      fontWeight: '700',
      fontSize: 14,
      letterSpacing: 0.4,
      textAlign: 'center',
      color: theme.ink,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.border,
      paddingBottom: 8,
    },
    row: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      fontSize: 14,
      color: theme.ink,
    },
    inputWide: { flex: undefined, width: '100%' },
    inputDisabled: { opacity: 0.4 },
    toggleBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 8,
      paddingVertical: 9,
      alignItems: 'center',
    },
    toggleBtnActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    toggleText: { fontSize: 14, color: theme.ink },
    toggleTextActive: { color: theme.accentInk, fontWeight: '600' },
    actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
    ghostBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    ghostBtnText: { fontSize: 13, fontWeight: '600', color: theme.ink },
    primaryBtn: {
      flex: 1,
      backgroundColor: theme.accent,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    primaryBtnText: { fontSize: 13, fontWeight: '700', color: theme.accentInk },
  })
}
