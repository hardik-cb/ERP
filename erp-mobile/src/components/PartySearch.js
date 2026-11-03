import { useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { createParty, getParties } from '../db'
import { Alert } from 'react-native'
import { useTheme } from '../theme'

export default function PartySearch({ value, onSelect, onEdit, readOnly }) {
  const theme = useTheme()
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [parties, setParties] = useState([])

  useEffect(() => {
    getParties().then(setParties)
  }, [])

  useEffect(() => setQuery(value || ''), [value])

  const matches = query
    ? parties.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : parties

  const pick = (party) => {
    onSelect(party)
    setQuery(party.name)
    setOpen(false)
  }

  const typed = query.trim()
  const canAdd = typed && !parties.some((p) => p.name.toLowerCase() === typed.toLowerCase())

  const addNew = async () => {
    try {
      const party = await createParty(typed)
      setParties((list) => (list.some((p) => p.id === party.id) ? list : [...list, party]))
      pick(party)
    } catch (e) {
      Alert.alert('Could not add party', String(e?.message || e))
    }
  }

  const styles = makeStyles(theme)

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          editable={!readOnly}
          placeholder="Party name"
          placeholderTextColor={theme.inkSoft}
          value={query}
          onFocus={() => setOpen(true)}
          onChangeText={(t) => {
            setQuery(t)
            setOpen(true)
            if (t !== value) onEdit?.()
          }}
        />
        <Text style={styles.searchIcon}>🔍</Text>
      </View>

      {open && (
        <View style={styles.dropdown}>
          <FlatList
            data={matches}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 220, backgroundColor: theme.cardBg, borderRadius: 10 }}
            ListHeaderComponent={
              canAdd ? (
                <Pressable style={styles.dropdownItem} onPress={addNew}>
                  <Text style={styles.dropdownAddText}>+ Add “{typed}”</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              canAdd ? null : <Text style={styles.dropdownEmpty}>No parties yet. Type a name to add one.</Text>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.dropdownItem} onPress={() => pick(item)}>
                <Text style={styles.dropdownItemText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    wrap: { position: 'relative', zIndex: 20 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    input: { flex: 1, fontSize: 16, color: theme.ink, padding: 0 },
    searchIcon: { opacity: 0.6 },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 4,
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      elevation: 6,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 12,
      zIndex: 30,
    },
    dropdownItem: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: theme.cardBg,
    },
    dropdownAddText: { fontSize: 14, fontWeight: '600', color: theme.accent },
    dropdownItemText: { fontSize: 14, color: theme.ink },
    dropdownEmpty: { padding: 14, color: theme.inkSoft, fontSize: 13 },
  })
}
