import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  scheduleAssignmentReminderNotification,
  cancelScheduledNotification,
} from '../services/notifications';

export type Course = {
  id: string;
  name: string;
  color: string;
};

export type Assignment = {
  id: string;
  title: string;
  courseId: string;
  dueDate: string;
  dueTime: string;
  description: string;
  submitted: boolean;
  reminderNotificationId?: string | null;
};

type AppDataContextType = {
  courses: Course[];
  assignments: Assignment[];
  isLoaded: boolean;
  addCourse: (name: string, color: string) => void;
  deleteCourse: (id: string) => Promise<void>;
  addAssignment: (
    title: string,
    courseId: string,
    dueDate: string,
    dueTime: string,
    description: string
  ) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  markAssignmentSubmitted: (id: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

const COURSES_STORAGE_KEY = 'smart-planner-courses';
const ASSIGNMENTS_STORAGE_KEY = 'smart-planner-assignments';

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    void saveCourses();
  }, [courses, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    void saveAssignments();
  }, [assignments, isLoaded]);

  const loadStoredData = async () => {
    try {
      const storedCourses = await AsyncStorage.getItem(COURSES_STORAGE_KEY);
      const storedAssignments = await AsyncStorage.getItem(
        ASSIGNMENTS_STORAGE_KEY
      );

      if (storedCourses) {
        setCourses(JSON.parse(storedCourses));
      }

      if (storedAssignments) {
        const parsedAssignments = JSON.parse(storedAssignments).map(
          (assignment: any) => ({
            ...assignment,
            submitted: assignment.submitted ?? false,
            dueTime: assignment.dueTime ?? '11:59 PM',
            reminderNotificationId: assignment.reminderNotificationId ?? null,
          })
        );

        setAssignments(parsedAssignments);
      }
    } catch (error) {
      console.log('Error loading stored data:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveCourses = async () => {
    try {
      await AsyncStorage.setItem(
        COURSES_STORAGE_KEY,
        JSON.stringify(courses)
      );
    } catch (error) {
      console.log('Error saving courses:', error);
    }
  };

  const saveAssignments = async () => {
    try {
      await AsyncStorage.setItem(
        ASSIGNMENTS_STORAGE_KEY,
        JSON.stringify(assignments)
      );
    } catch (error) {
      console.log('Error saving assignments:', error);
    }
  };

  const addCourse = (name: string, color: string) => {
    if (name.trim() === '') return;

    const newCourse: Course = {
      id: Date.now().toString(),
      name: name.trim(),
      color,
    };

    setCourses((prev) => [...prev, newCourse]);
  };

  const deleteCourse = async (id: string) => {
    const assignmentsToRemove = assignments.filter(
      (assignment) => assignment.courseId === id
    );

    for (const assignment of assignmentsToRemove) {
      await cancelScheduledNotification(assignment.reminderNotificationId);
    }

    setCourses((prev) => prev.filter((course) => course.id !== id));
    setAssignments((prev) =>
      prev.filter((assignment) => assignment.courseId !== id)
    );
  };

  const addAssignment = async (
    title: string,
    courseId: string,
    dueDate: string,
    dueTime: string,
    description: string
  ) => {
    if (
      title.trim() === '' ||
      courseId.trim() === '' ||
      dueDate.trim() === '' ||
      dueTime.trim() === ''
    ) {
      return;
    }

    const course = courses.find((item) => item.id === courseId);
    const courseName = course ? course.name : 'Course';

    const reminderNotificationId =
      await scheduleAssignmentReminderNotification({
        courseName,
        assignmentTitle: title.trim(),
        dueDate: dueDate.trim(),
        dueTime: dueTime.trim(),
      });

    const newAssignment: Assignment = {
      id: Date.now().toString(),
      title: title.trim(),
      courseId,
      dueDate: dueDate.trim(),
      dueTime: dueTime.trim(),
      description: description.trim(),
      submitted: false,
      reminderNotificationId,
    };

    setAssignments((prev) => [...prev, newAssignment]);
  };

  const deleteAssignment = async (id: string) => {
    const assignment = assignments.find((item) => item.id === id);
    await cancelScheduledNotification(assignment?.reminderNotificationId);

    setAssignments((prev) =>
      prev.filter((assignment) => assignment.id !== id)
    );
  };

  const markAssignmentSubmitted = async (id: string) => {
    const assignment = assignments.find((item) => item.id === id);
    await cancelScheduledNotification(assignment?.reminderNotificationId);

    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              submitted: true,
              reminderNotificationId: null,
            }
          : item
      )
    );
  };

  return (
    <AppDataContext.Provider
      value={{
        courses,
        assignments,
        isLoaded,
        addCourse,
        deleteCourse,
        addAssignment,
        deleteAssignment,
        markAssignmentSubmitted,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error('useAppData must be used inside AppDataProvider');
  }

  return context;
}