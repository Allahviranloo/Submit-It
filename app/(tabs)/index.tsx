import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppData } from '../../context/AppDataContext';
import { COLORS } from '../../constants/website-colors';
import AnimatedCard from '../../components/card-animation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GuideModal from '../../components/GuideModal';

export default function DashboardScreen() {
  const { assignments, courses } = useAppData();

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

  const getCourseName = (courseId: string) => {
    const course = courses.find((item) => item.id === courseId);
    return course ? course.name : 'Unknown Course';
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

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const dueToday = assignments.filter((assignment) => {
    if (assignment.submitted) return false;
    const dateTime = getAssignmentDateTime(assignment.dueDate, assignment.dueTime);
    return dateTime >= startOfToday && dateTime <= endOfToday;
  });

  const upcoming = assignments
    .filter((assignment) => {
      if (assignment.submitted) return false;
      const dateTime = getAssignmentDateTime(assignment.dueDate, assignment.dueTime);
      return dateTime > endOfToday;
    })
    .sort(
      (a, b) =>
        getAssignmentDateTime(a.dueDate, a.dueTime).getTime() -
        getAssignmentDateTime(b.dueDate, b.dueTime).getTime()
    );

  const overdue = assignments
    .filter((assignment) => {
      if (assignment.submitted) return false;
      const dateTime = getAssignmentDateTime(assignment.dueDate, assignment.dueTime);
      return dateTime < now;
    })
    .sort(
      (a, b) =>
        getAssignmentDateTime(a.dueDate, a.dueTime).getTime() -
        getAssignmentDateTime(b.dueDate, b.dueTime).getTime()
    );

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const checkGuide = async () => {
      const hasSeenGuide = await AsyncStorage.getItem('hasSeenDashboardGuide');

      if (!hasSeenGuide) {
        setShowGuide(true);
      }
    };

    void checkGuide();
  }, []);

  const closeGuide = async () => {
    await AsyncStorage.setItem('hasSeenDashboardGuide', 'true');
    setShowGuide(false);
  };

  const renderAssignmentCard = (
    title: string,
    items: typeof assignments,
    emptyMessage: string
  ) => (
    <AnimatedCard>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>

        {items.length === 0 ? (
          <Text style={styles.cardText}>{emptyMessage}</Text>
        ) : (
          items.map((item) => {
            const priority = getPriority(item.dueDate, item.dueTime, item.submitted);

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.assignmentItem}
                onPress={() => router.push(`/assignment/${item.id}`)}
                activeOpacity={0.8}
              >
                <View style={styles.assignmentTopRow}>
                  <Text style={styles.assignmentTitle}>{item.title}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: priority.bg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityBadgeText,
                        { color: priority.color },
                      ]}
                    >
                      {priority.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.assignmentMeta}>
                  {getCourseName(item.courseId)} • {item.dueDate} at {item.dueTime}
                </Text>

                {item.description ? (
                  <Text style={styles.assignmentDescription}>{item.description}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </AnimatedCard>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <GuideModal
        visible={showGuide}
        title="Welcome to your Dashboard"
        message="This page shows your assignments grouped by due today, upcoming, overdue, and submitted work so you can quickly see what needs attention."
        onClose={() => {
          void closeGuide();
        }}
      />
      <FlatList
        data={[]}
        renderItem={null}
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Submit-It</Text>
            <Text style={styles.subtitle}>Why forget it? Just Submit-It.</Text>

            {renderAssignmentCard('Due Today', dueToday, 'No assignments due today')}
            {renderAssignmentCard('Upcoming', upcoming, 'No upcoming assignments')}
            {renderAssignmentCard('Overdue', overdue, 'Nothing overdue')}
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 30,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 12,
    color: COLORS.textPrimary,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  assignmentItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  assignmentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 10,
  },
  assignmentMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  assignmentDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});