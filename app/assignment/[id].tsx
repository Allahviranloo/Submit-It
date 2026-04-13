import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useAppData } from '../../context/AppDataContext';
import { COLORS } from '../../constants/website-colors';

export default function AssignmentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { assignments, courses, markAssignmentSubmitted } = useAppData();

  const assignment = assignments.find((item) => item.id === id);
  const course = courses.find((item) => item.id === assignment?.courseId);

  const now = new Date();

  const parseTimeString = (timeString: string) => {
    const [time, modifier] = timeString.split(' ');
    const [rawHours, rawMinutes] = time.split(':');

    let hours = parseInt(rawHours, 10);
    const minutes = parseInt(rawMinutes, 10);

    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    } else if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }

    return { hours, minutes };
  };

  const getAssignmentDateTime = (dueDate: string, dueTime: string) => {
    const [year, month, day] = dueDate.split('-').map(Number);
    const { hours, minutes } = parseTimeString(dueTime);

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const getPriority = (dueDate: string, dueTime: string, submitted: boolean) => {
    if (submitted) {
      return { label: 'Submitted', color: COLORS.success, bg: COLORS.successSoft };
    }

    const assignmentDateTime = getAssignmentDateTime(dueDate, dueTime);
    const diffMs = assignmentDateTime.getTime() - now.getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);

    if (days <= 0) {
      return { label: 'Urgent', color: COLORS.danger, bg: COLORS.dangerSoft };
    }

    if (days <= 2) {
      return { label: 'Soon', color: '#c2410c', bg: '#ffedd5' };
    }

    if (days <= 7) {
      return { label: 'This Week', color: COLORS.warning, bg: COLORS.warningSoft };
    }

    return { label: 'Later', color: COLORS.success, bg: COLORS.successSoft };
  };

  if (!assignment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.notFoundTitle}>Assignment not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const priority = getPriority(
    assignment.dueDate,
    assignment.dueTime,
    assignment.submitted
  );

  const handleSubmitted = async () => {
    await markAssignmentSubmitted(assignment.id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{assignment.title}</Text>
          <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
            <Text style={[styles.priorityBadgeText, { color: priority.color }]}>
              {priority.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Course</Text>
          <Text style={styles.value}>{course ? course.name : 'Unknown Course'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>{assignment.dueDate}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Due Time</Text>
          <Text style={styles.value}>{assignment.dueTime}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.label}>Description</Text>
          <Text style={styles.description}>
            {assignment.description || 'No description provided.'}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            assignment.submitted && styles.submitButtonDisabled,
          ]}
          onPress={() => {
            void handleSubmitted();
          }}
          disabled={assignment.submitted}
        >
          <Text style={styles.submitButtonText}>
            {assignment.submitted ? 'Submitted' : 'Mark as Submitted'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    marginTop: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  priorityBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  submitButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.successSoft,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  notFoundTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: COLORS.textPrimary,
  },
});