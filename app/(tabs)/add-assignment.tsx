import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { router } from 'expo-router';
import { useAppData } from '../../context/AppDataContext';
import { COLORS } from '../../constants/website-colors';
import AnimatedCard from '../../components/card-animation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GuideModal from '../../components/GuideModal';
import { BlurView } from 'expo-blur';

export default function AddAssignmentScreen() {
  const { courses, assignments, addAssignment, deleteAssignment } = useAppData();

  const [title, setTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [description, setDescription] = useState('');

  const [selectedDateObject, setSelectedDateObject] = useState(new Date());
  const [dueDate, setDueDate] = useState(formatDate(new Date()));
  const [dueTime, setDueTime] = useState(formatTime(new Date()));

  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setTimePickerVisible] = useState(false);
  const [isCourseModalVisible, setCourseModalVisible] = useState(false);

  const now = new Date();

  function formatDate(date: Date) {
    return date.toISOString().split('T')[0];
  }

  function formatTime(date: Date) {
    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

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

  const getAssignmentDateTime = (
    assignmentDate: string,
    assignmentTime: string
  ) => {
    const [year, month, day] = assignmentDate.split('-').map(Number);
    const { hours, minutes } = parseTimeString(assignmentTime);

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  };

  const getPriority = (
    assignmentDate: string,
    assignmentTime: string,
    submitted: boolean
  ) => {
    if (submitted) {
      return {
        label: 'Submitted',
        color: COLORS.success,
        bg: COLORS.successSoft,
      };
    }

    const assignmentDateTime = getAssignmentDateTime(
      assignmentDate,
      assignmentTime
    );
    const diffMs = assignmentDateTime.getTime() - now.getTime();
    const days = diffMs / (1000 * 60 * 60 * 24);

    if (days <= 0) {
      return { label: 'Urgent', color: COLORS.danger, bg: COLORS.dangerSoft };
    }

    if (days <= 2) {
      return { label: 'Soon', color: '#c2410c', bg: '#ffedd5' };
    }

    if (days <= 7) {
      return {
        label: 'This Week',
        color: COLORS.warning,
        bg: COLORS.warningSoft,
      };
    }

    return { label: 'Later', color: COLORS.success, bg: COLORS.successSoft };
  };

  const selectedCourseName = useMemo(() => {
    const course = courses.find((item) => item.id === selectedCourseId);
    return course ? course.name : '';
  }, [courses, selectedCourseId]);

  const handleSaveAssignment = async () => {
    if (
      title.trim() === '' ||
      selectedCourseId.trim() === '' ||
      dueDate.trim() === '' ||
      dueTime.trim() === ''
    ) {
      return;
    }

    await addAssignment(title, selectedCourseId, dueDate, dueTime, description);

    const resetDate = new Date();

    setTitle('');
    setSelectedCourseId('');
    setDescription('');
    setSelectedDateObject(resetDate);
    setDueDate(formatDate(resetDate));
    setDueTime(formatTime(resetDate));
  };

  const handleConfirmDate = (pickedDate: Date) => {
    const updatedDate = new Date(selectedDateObject);
    updatedDate.setFullYear(
      pickedDate.getFullYear(),
      pickedDate.getMonth(),
      pickedDate.getDate()
    );

    setSelectedDateObject(updatedDate);
    setDueDate(formatDate(updatedDate));
    setDatePickerVisible(false);
  };

  const handleConfirmTime = (pickedTime: Date) => {
    const updatedDate = new Date(selectedDateObject);
    updatedDate.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);

    setSelectedDateObject(updatedDate);
    setDueTime(formatTime(updatedDate));
    setTimePickerVisible(false);
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setCourseModalVisible(false);
  };

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const checkGuide = async () => {
      const hasSeenGuide = await AsyncStorage.getItem('hasSeenAssignmentsGuide');

      if (!hasSeenGuide) {
        setShowGuide(true);
      }
    };

    void checkGuide();
  }, []);

  const closeGuide = async () => {
    await AsyncStorage.setItem('hasSeenAssignmentsGuide', 'true');
    setShowGuide(false);
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          void deleteAssignment(id);
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const getCourseName = (courseId: string) => {
    const course = courses.find((item) => item.id === courseId);
    return course ? course.name : 'Unknown Course';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GuideModal
        visible={showGuide}
        title="Add and Manage Assignments"
        message="Create assignments here by choosing a course, due date, and due time. Assignly will organize them on your dashboard and remind you before deadlines."
        onClose={() => {
          void closeGuide();
        }}
      />
      <Modal
        visible={isCourseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCourseModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCourseModalVisible(false)}
        >
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select a course</Text>

            {courses.length === 0 ? (
              <Text style={styles.modalEmptyText}>No courses available.</Text>
            ) : (
              <FlatList
                data={courses}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.courseOption}
                    onPress={() => handleSelectCourse(item.id)}
                    activeOpacity={0.85}
                  >
                    <View
                      style={[
                        styles.courseOptionDot,
                        { backgroundColor: item.color },
                      ]}
                    />
                    <Text style={styles.courseOptionText}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setCourseModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <AnimatedCard>
            <View>
              <Text style={styles.title}>Add Assignment</Text>
              <Text style={styles.subtitle}>Create a new assignment.</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Assignment Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Database Project"
                  placeholderTextColor={COLORS.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Course</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setCourseModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.selectorButtonText,
                      !selectedCourseName && styles.selectorPlaceholderText,
                    ]}
                  >
                    {selectedCourseName || 'Select a course'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Due Date</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setDatePickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pickerButtonText}>{dueDate}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.rowItem}>
                  <Text style={styles.label}>Due Time</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setTimePickerVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pickerButtonText}>{dueTime}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={selectedDateObject}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisible(false)}
              />

              <DateTimePickerModal
                isVisible={isTimePickerVisible}
                mode="time"
                date={selectedDateObject}
                onConfirm={handleConfirmTime}
                onCancel={() => setTimePickerVisible(false)}
              />

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Optional details"
                  placeholderTextColor={COLORS.textSecondary}
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  courses.length === 0 && styles.buttonDisabled,
                ]}
                onPress={() => {
                  void handleSaveAssignment();
                }}
                disabled={courses.length === 0}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Save Assignment</Text>
              </TouchableOpacity>

              {courses.length === 0 && (
                <View style={styles.noticeCard}>
                  <Text style={styles.noticeTitle}>Add a course first</Text>
                  <Text style={styles.noticeText}>
                    You need at least one course before creating assignments.
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Your Assignments</Text>

              {assignments.length === 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>No assignments yet</Text>
                  <Text style={styles.cardText}>
                    Add your first assignment using the form above.
                  </Text>
                </View>
              )}
            </View>
          </AnimatedCard>
        }
        renderItem={({ item }) => {
          const priority = getPriority(
            item.dueDate,
            item.dueTime,
            item.submitted
          );

          return (
            <AnimatedCard>
              <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <TouchableOpacity
                  style={[
                    styles.assignmentCard,
                    item.submitted && styles.assignmentCardSubmitted,
                  ]}
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
                    Course: {getCourseName(item.courseId)}
                  </Text>
                  <Text style={styles.assignmentMeta}>
                    Due: {item.dueDate} at {item.dueTime}
                  </Text>

                  {item.description !== '' && (
                    <Text style={styles.assignmentDescription}>
                      {item.description}
                    </Text>
                  )}

                  {item.submitted && (
                    <Text style={styles.submittedBadge}>Submitted</Text>
                  )}
                </TouchableOpacity>
              </Swipeable>
            </AnimatedCard>
          );
        }}
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
    paddingBottom: 24,
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
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  rowItem: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectorButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  selectorButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  selectorPlaceholderText: {
    color: COLORS.textSecondary,
  },
  pickerButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerButtonText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noticeCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fdba74',
    padding: 16,
    borderRadius: 18,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 14,
    color: '#9a3412',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    padding: 18,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  assignmentCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  assignmentCardSubmitted: {
    opacity: 0.75,
  },
  assignmentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    flex: 1,
    marginRight: 10,
  },
  assignmentMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  assignmentDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  submittedBadge: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteAction: {
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    marginTop: 12,
    borderRadius: 18,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 22,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  modalList: {
    maxHeight: 320,
  },
  modalEmptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  courseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  courseOptionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  courseOptionText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});