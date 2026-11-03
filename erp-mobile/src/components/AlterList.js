import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import PageHeader, { pageTopPadding } from './PageHeader'
import { useTheme } from '../theme'

// Shared by Alter Party and Alter Items: search box on top, the full list
// below, and an "Add" pill at the bottom. rows: [{ id, name, description, meta: [text] }]
export default function AlterList({ title, searchPlaceholder, rows, loaded, addLabel, emptyText, onBack, onAdd, onOpen }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows
  }, [rows, query])

  return (
    <View style={styles.root}>
      <PageHeader title={title} onBack={onBack} />
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder={searchPlaceholder}
          placeholderTextColor={theme.inkSoft}
          value={query}
          onChangeText={setQuery}
        />
      </View>
      <FlatList
        data={shown}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={loaded ? <Text style={styles.empty}>{rows.length === 0 ? emptyText : 'No match.'}</Text> : null}
        renderItem={({ item: r }) => (
          <Pressable style={styles.card} onPress={() => onOpen(r)}>
            <Text style={styles.name}>{r.name}</Text>
            {!!r.description && <Text style={styles.sub}>{r.description}</Text>}
            <View style={styles.meta}>
              {r.meta.map((m, i) => (
                <Text key={i} style={styles.metaText}>
                  {m}
                </Text>
              ))}
            </View>
          </Pressable>
        )}
      />
      <View style={styles.fabWrap}>
        <Pressable style={styles.fab} onPress={onAdd}>
          <Text style={styles.fabPlus}>+</Text>
          <Text style={styles.fabText}>{addLabel}</Text>
        </Pressable>
      </View>
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.bg, paddingTop: pageTopPadding },
    searchWrap: { padding: 14, paddingBottom: 4 },
    search: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.borderStrong,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.ink,
    },
    list: { padding: 14, gap: 12, paddingBottom: 110 },
    empty: { textAlign: 'center', color: theme.inkSoft, paddingVertical: 48 },
    card: {
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      elevation: 2,
    },
    name: { fontSize: 17, color: theme.ink },
    sub: { fontSize: 13, color: theme.inkSoft, marginTop: 2 },
    meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 8 },
    metaText: { fontSize: 13, color: theme.inkSoft },
    fabWrap: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
    fab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: '#f0224f',
      borderRadius: 30,
      paddingVertical: 15,
      paddingHorizontal: 30,
      elevation: 8,
    },
    fabPlus: { color: '#fff', fontSize: 26, lineHeight: 28 },
    fabText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  })
}
