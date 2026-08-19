import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useAppData } from '../../context/AppDataContext';
import { COLORS } from '../../constants/website-colors';
import { getReminderFrequencyLabel } from '../../services/notifications';

export default function ReminderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reminders, markReminderCompleted } = useAppData();
  const reminder = reminders.find((item) => item.id === id);

  if (!reminder) {
    return <SafeAreaView style={styles.safeArea}><View style={styles.container}><Text style={styles.title}>Reminder not found</Text><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>Go Back</Text></TouchableOpacity></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{reminder.title}</Text>
        {reminder.completed && <Text style={styles.completedBadge}>Completed</Text>}
        <View style={styles.card}><Text style={styles.label}>First Reminder</Text><Text style={styles.value}>{reminder.reminderDate} at {reminder.reminderTime}</Text></View>
        <View style={styles.card}><Text style={styles.label}>Frequency</Text><Text style={styles.value}>{reminder.reminderFrequency === 'once' ? 'Once at selected time' : getReminderFrequencyLabel(reminder.reminderFrequency)}</Text></View>
        <View style={styles.card}><Text style={styles.label}>Description</Text><Text style={styles.description}>{reminder.description || 'No description provided.'}</Text></View>
        <TouchableOpacity style={[styles.completeButton, reminder.completed && styles.disabled]} disabled={reminder.completed} onPress={() => void markReminderCompleted(reminder.id)}><Text style={styles.completeText}>{reminder.completed ? 'Completed' : 'Mark as Completed'}</Text></TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><Text style={styles.backText}>Back</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background }, container: { flex: 1, padding: 20, paddingTop: 18 },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 12 }, completedBadge: { alignSelf: 'flex-start', color: COLORS.success, backgroundColor: COLORS.successSoft, fontWeight: '700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, marginBottom: 14 },
  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 18, marginBottom: 16, elevation: 2 }, label: { color: COLORS.textSecondary, textTransform: 'uppercase', fontSize: 13, fontWeight: '700', marginBottom: 8 }, value: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '600' }, description: { color: COLORS.textSecondary, fontSize: 16, lineHeight: 22 },
  completeButton: { backgroundColor: COLORS.success, paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginTop: 8, marginBottom: 14 }, disabled: { backgroundColor: COLORS.successSoft }, completeText: { color: '#fff', fontSize: 18, fontWeight: '700' }, backButton: { backgroundColor: '#e5e7eb', paddingVertical: 16, borderRadius: 16, alignItems: 'center' }, backText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 16 },
});
