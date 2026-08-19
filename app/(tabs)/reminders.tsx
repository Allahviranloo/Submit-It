import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { router } from 'expo-router';
import AnimatedCard from '../../components/card-animation';
import { COLORS } from '../../constants/website-colors';
import { useAppData } from '../../context/AppDataContext';
import { getReminderFrequencyLabel, REMINDER_FREQUENCY_OPTIONS, ReminderFrequency } from '../../services/notifications';

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};
const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function RemindersScreen() {
  const { reminders, addReminder, deleteReminder } = useAppData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateObject, setDateObject] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [reminderDate, setReminderDate] = useState(formatDate(dateObject));
  const [reminderTime, setReminderTime] = useState(formatTime(dateObject));
  const [frequency, setFrequency] = useState<ReminderFrequency>('once');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    await addReminder(title, reminderDate, reminderTime, description, frequency);
    const nextDate = new Date(Date.now() + 60 * 60 * 1000);
    setTitle('');
    setDescription('');
    setDateObject(nextDate);
    setReminderDate(formatDate(nextDate));
    setReminderTime(formatTime(nextDate));
    setFrequency('once');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={<AnimatedCard><View>
          <Text style={styles.title}>General Reminders</Text>
          <Text style={styles.subtitle}>Set reminders for anything</Text>
          <Text style={styles.label}>Reminder Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Take medication" placeholderTextColor={COLORS.textSecondary} />
          <View style={styles.row}>
            <View style={styles.rowItem}><Text style={styles.label}>Start Date</Text><TouchableOpacity style={styles.input} onPress={() => setDatePickerVisible(true)}><Text>{reminderDate}</Text></TouchableOpacity></View>
            <View style={styles.rowItem}><Text style={styles.label}>Start Time</Text><TouchableOpacity style={styles.input} onPress={() => setTimePickerVisible(true)}><Text>{reminderTime}</Text></TouchableOpacity></View>
          </View>
          <DateTimePickerModal isVisible={datePickerVisible} mode="date" date={dateObject} onCancel={() => setDatePickerVisible(false)} onConfirm={(date) => { const next = new Date(dateObject); next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); setDateObject(next); setReminderDate(formatDate(next)); setDatePickerVisible(false); }} />
          <DateTimePickerModal isVisible={timePickerVisible} mode="time" date={dateObject} onCancel={() => setTimePickerVisible(false)} onConfirm={(date) => { const next = new Date(dateObject); next.setHours(date.getHours(), date.getMinutes(), 0, 0); setDateObject(next); setReminderTime(formatTime(next)); setTimePickerVisible(false); }} />
          <Text style={styles.label}>Notify Me</Text>
          <View style={styles.frequencyGrid}>{REMINDER_FREQUENCY_OPTIONS.map((option) => <TouchableOpacity key={option.value} style={[styles.frequencyOption, frequency === option.value && styles.frequencySelected]} onPress={() => setFrequency(option.value)}><Text style={[styles.frequencyText, frequency === option.value && styles.frequencyTextSelected]}>{option.value === 'once' ? 'Once at start time' : option.label}</Text></TouchableOpacity>)}</View>
          <Text style={styles.label}>Description</Text>
          <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Optional details" placeholderTextColor={COLORS.textSecondary} />
          <TouchableOpacity style={[styles.button, !title.trim() && styles.disabled]} disabled={!title.trim()} onPress={() => void save()}><Text style={styles.buttonText}>Save Reminder</Text></TouchableOpacity>
          <Text style={styles.sectionTitle}>Your Reminders</Text>
          {!reminders.length && <Text style={styles.empty}>No reminders yet.</Text>}
        </View></AnimatedCard>}
        renderItem={({ item }) => <AnimatedCard><Swipeable renderRightActions={() => <TouchableOpacity style={styles.deleteAction} onPress={() => void deleteReminder(item.id)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>}><TouchableOpacity style={[styles.card, item.completed && styles.completed]} onPress={() => router.push({pathname: '/reminder/[id]', params: { id: item.id }, })}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.meta}>{item.reminderDate} at {item.reminderTime}</Text><Text style={styles.meta}>{item.reminderFrequency === 'once' ? 'Once at selected time' : getReminderFrequencyLabel(item.reminderFrequency)}</Text>{item.completed && <Text style={styles.completeText}>Completed</Text>}</TouchableOpacity></Swipeable></AnimatedCard>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background }, container: { padding: 20, paddingTop: 10, paddingBottom: 30 },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.textPrimary, marginTop: 10, marginBottom: 4 }, subtitle: { color: COLORS.textSecondary, marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, marginTop: 8 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: COLORS.textPrimary },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 }, rowItem: { flex: 1 }, textArea: { minHeight: 90, textAlignVertical: 'top' },
  frequencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }, frequencyOption: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }, frequencySelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primarySoft }, frequencyText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 13 }, frequencyTextSelected: { color: COLORS.primary },
  button: { backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 18, marginBottom: 22 }, disabled: { opacity: 0.5 }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 }, empty: { color: COLORS.textSecondary, marginBottom: 8 },
  card: { backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginTop: 12, elevation: 3 }, completed: { opacity: 0.65 }, cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }, meta: { color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }, completeText: { color: COLORS.success, fontWeight: '700', marginTop: 7 },
  deleteAction: { backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center', width: 90, marginTop: 12, borderRadius: 18 }, deleteText: { color: '#fff', fontWeight: '700' },
});
