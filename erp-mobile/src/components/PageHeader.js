import { Platform, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../theme'

export default function PageHeader({ title, onBack }) {
  const theme = useTheme()
  const styles = makeStyles(theme)
  return (
    <View style={styles.header}>
      <Pressable hitSlop={12} onPress={onBack}>
        <Text style={styles.icon}>←</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  )
}

function makeStyles(theme) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.cardBg,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    icon: { fontSize: 20, color: theme.ink },
    title: { flex: 1, fontSize: 22, color: theme.ink },
  })
}

// Screens that use PageHeader sit below the Android status bar.
export const pageTopPadding = Platform.OS === 'android' ? StatusBar.currentHeight : 0
