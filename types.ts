export enum Sender {
  USER = 'user',
  AXIOM = 'axiom',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
}

export enum AvatarMood {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  SUCCESS = 'SUCCESS', // Excited/Correct
  CONFUSED = 'CONFUSED',
  SAD = 'SAD', // Disappointed/Wrong
  ALMOST = 'ALMOST' // Encouraging/Close
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

// Allow any string so users can learn anything (e.g., 'Astronomy', 'Robotics')
export type Subject = string;

export interface UserProfile {
  name: string;
  age: string;
  grade: string;
  focusSubject: Subject;
  enrolledCourses: Subject[]; // List of active courses
  avatarImage?: string; // Base64 string of the image
  streak: number;
  lastLoginDate: string; // ISO String
}