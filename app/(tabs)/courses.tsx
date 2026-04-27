import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useAppData } from '../../context/AppDataContext';
import { COLORS } from '../../constants/website-colors';
import AnimatedCard from '../../components/card-animation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GuideModal from '../../components/GuideModal';



const COURSE_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#EAB308',
  '#84CC16',
  '#22C55E',
  '#10B981',
  '#14B8A6',
  '#06B6D4',
  '#0EA5E9',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#A855F7',
  '#D946EF',
  '#EC4899',
  '#F43F5E',
  '#78716C',
  '#6B7280',
  '#1F2937',
];

export default function CoursesScreen() {
  const { courses, addCourse, deleteCourse } = useAppData();

  const [courseName, setCourseName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COURSE_COLORS[10]);

  const handleAddCourse = () => {
    if (courseName.trim() === '') return;

    addCourse(courseName, selectedColor);
    setCourseName('');
    setSelectedColor(COURSE_COLORS[10]);
  };

  const renderRightActions = (id: string) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => deleteCourse(id)}
      >
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const checkGuide = async () => {
      const hasSeenGuide = await AsyncStorage.getItem('hasSeenCoursesGuide');

      if (!hasSeenGuide) {
        setShowGuide(true);
      }
    };

    void checkGuide();
  }, []);

  const closeGuide = async () => {
    await AsyncStorage.setItem('hasSeenCoursesGuide', 'true');
    setShowGuide(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GuideModal
        visible={showGuide}
        title="Cpirse Organization"
        message="Create courses here and assign each one a color. When you add assignments, you can link them to these courses so everything stays organized."
        onClose={() => {
          void closeGuide();
        }}
      />
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <AnimatedCard>
            <View>
              <Text style={styles.title}>Courses</Text>
              <Text style={styles.subtitle}>Manage your courses here.</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Course Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. CS2043"
                  placeholderTextColor={COLORS.textSecondary}
                  value={courseName}
                  onChangeText={setCourseName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Choose a Color</Text>
                <View style={styles.colorGrid}>
                  {COURSE_COLORS.map((color) => {
                    const isSelected = selectedColor === color;

                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          { backgroundColor: color },
                          isSelected && styles.selectedColorOption,
                        ]}
                        onPress={() => setSelectedColor(color)}
                        activeOpacity={0.8}
                      />
                    );
                  })}
                </View>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleAddCourse}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Add Course</Text>
              </TouchableOpacity>

              <Text style={styles.sectionTitle}>Your Courses</Text>

              {courses.length === 0 && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>No courses yet</Text>
                  <Text style={styles.cardText}>
                    Add your first course using the form above.
                  </Text>
                </View>
              )}
            </View>
          </AnimatedCard>
        }
        renderItem={({ item }) => (
          <AnimatedCard>
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
              <View style={styles.courseCard}>
                <View style={styles.courseInfo}>
                  <View
                    style={[styles.colorDot, { backgroundColor: item.color }]}
                  />
                  <View>
                    <Text style={styles.courseName}>{item.name}</Text>
                  </View>
                </View>
              </View>
            </Swipeable>
          </AnimatedCard>
        )}
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: COLORS.textPrimary,
    transform: [{ scale: 1.08 }],
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
  courseCard: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  courseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 14,
  },
  courseName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  courseColorText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
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
});