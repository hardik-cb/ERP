import { useEffect, useState } from 'react'
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { createItem, getItems } from '../db'
import { useTheme } from '../theme'

export default function AddItemSearch({ onAdd }) {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [itemList, setItemList] = useState([])

  useEffect(() => {
    getItems().then(setItemList)
  }, [])

  const matches = query
    ? itemList.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : itemList

  const pick = (master) => {
    onAdd(master)
    setQuery('')
    setOpen(false)
  }

  const typed = query.trim()
  const canAdd = typed && !itemList.some((i) => i.name.toLowerCase() === typed.toLowerCase())

  const addNew = async () => {
    try {
      const item = await createItem(typed)
      setItemList((list) => (list.some((i) => i.id === item.id) ? list : [...list, item]))
      pick(item)
    } catch (e) {
      Alert.alert('Could not add item', String(e?.message || e))
    }
  }

  const styles = makeStyles(theme)

  return (
    <View style={styles.wrap}>
      <TextInput
        style={styles.input}
        placeholder="+ Search item to add..."
        placeholderTextColor={theme.inkSoft}
        value={query}
        onFocus={() => setOpen(true)}
        onChangeText={(t) => {
          setQuery(t)
          setOpen(true)
        }}
      />
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
              canAdd ? null : <Text style={styles.dropdownEmpty}>No items yet. Type a name to add one.</Text>
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
    wrap: { position: 'relative', marginTop: 2, zIndex: 10 },
    input: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: theme.ink,
    },
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
