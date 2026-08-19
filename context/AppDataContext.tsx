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
  scheduleGeneralReminderNotification,
  cancelScheduledNotifications,
  ReminderFrequency,
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
  reminderNotificationIds?: string[];
  reminderFrequency: ReminderFrequency;
};

export type GeneralReminder = {
  id: string;
  title: string;
  reminderDate: string;
  reminderTime: string;
  description: string;
  completed: boolean;
  reminderFrequency: ReminderFrequency;
  reminderNotificationIds: string[];
};

type AppDataContextType = {
  courses: Course[];
  assignments: Assignment[];
  reminders: GeneralReminder[];
  isLoaded: boolean;
  addCourse: (name: string, color: string) => void;
  deleteCourse: (id: string) => Promise<void>;
  addAssignment: (
    title: string,
    courseId: string,
    dueDate: string,
    dueTime: string,
    description: string,
    reminderFrequency: ReminderFrequency
  ) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  markAssignmentSubmitted: (id: string) => Promise<void>;
  addReminder: (title: string, reminderDate: string, reminderTime: string, description: string, reminderFrequency: ReminderFrequency) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  markReminderCompleted: (id: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

const COURSES_STORAGE_KEY = 'smart-planner-courses';
const ASSIGNMENTS_STORAGE_KEY = 'smart-planner-assignments';
const REMINDERS_STORAGE_KEY = 'smart-planner-general-reminders';

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [reminders, setReminders] = useState<GeneralReminder[]>([]);
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

  useEffect(() => {
    if (!isLoaded) return;
    void AsyncStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
  }, [reminders, isLoaded]);

  const loadStoredData = async () => {
    try {
      const storedCourses = await AsyncStorage.getItem(COURSES_STORAGE_KEY);
      const storedAssignments = await AsyncStorage.getItem(
        ASSIGNMENTS_STORAGE_KEY
      );
      const storedReminders = await AsyncStorage.getItem(REMINDERS_STORAGE_KEY);

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
            reminderNotificationIds: assignment.reminderNotificationIds ?? (assignment.reminderNotificationId ? [assignment.reminderNotificationId] : []),
            reminderFrequency: assignment.reminderFrequency ?? 'once',
          })
        );

        setAssignments(parsedAssignments);
      }
      if (storedReminders) setReminders(JSON.parse(storedReminders));
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
      await cancelScheduledNotifications(assignment.reminderNotificationIds ?? assignment.reminderNotificationId);
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
    description: string,
    reminderFrequency: ReminderFrequency
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

    const reminderNotificationIds =
      await scheduleAssignmentReminderNotification({
        courseName,
        assignmentTitle: title.trim(),
        dueDate: dueDate.trim(),
        dueTime: dueTime.trim(),
        frequency: reminderFrequency,
      });

    const newAssignment: Assignment = {
      id: Date.now().toString(),
      title: title.trim(),
      courseId,
      dueDate: dueDate.trim(),
      dueTime: dueTime.trim(),
      description: description.trim(),
      submitted: false,
      reminderNotificationIds,
      reminderFrequency,
    };

    setAssignments((prev) => [...prev, newAssignment]);
  };

  const deleteAssignment = async (id: string) => {
    const assignment = assignments.find((item) => item.id === id);
    await cancelScheduledNotifications(assignment?.reminderNotificationIds ?? assignment?.reminderNotificationId);

    setAssignments((prev) =>
      prev.filter((assignment) => assignment.id !== id)
    );
  };

  const markAssignmentSubmitted = async (id: string) => {
    const assignment = assignments.find((item) => item.id === id);
    await cancelScheduledNotifications(assignment?.reminderNotificationIds ?? assignment?.reminderNotificationId);

    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              submitted: true,
              reminderNotificationId: null,
              reminderNotificationIds: [],
            }
          : item
      )
    );
  };

  const addReminder = async (title: string, reminderDate: string, reminderTime: string, description: string, reminderFrequency: ReminderFrequency) => {
    if (!title.trim() || !reminderDate.trim() || !reminderTime.trim()) return;
    const reminderNotificationIds = await scheduleGeneralReminderNotification({
      title: title.trim(), reminderDate, reminderTime, frequency: reminderFrequency,
    });
    setReminders((prev) => [...prev, {
      id: Date.now().toString(), title: title.trim(), reminderDate, reminderTime,
      description: description.trim(), completed: false, reminderFrequency, reminderNotificationIds,
    }]);
  };

  const deleteReminder = async (id: string) => {
    const reminder = reminders.find((item) => item.id === id);
    await cancelScheduledNotifications(reminder?.reminderNotificationIds);
    setReminders((prev) => prev.filter((item) => item.id !== id));
  };

  const markReminderCompleted = async (id: string) => {
    const reminder = reminders.find((item) => item.id === id);
    await cancelScheduledNotifications(reminder?.reminderNotificationIds);
    setReminders((prev) => prev.map((item) => item.id === id ? { ...item, completed: true, reminderNotificationIds: [] } : item));
  };

  return (
    <AppDataContext.Provider
      value={{
        courses,
        assignments,
        reminders,
        isLoaded,
        addCourse,
        deleteCourse,
        addAssignment,
        deleteAssignment,
        markAssignmentSubmitted,
        addReminder,
        deleteReminder,
        markReminderCompleted,
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
