export enum ProficiencyLevel {
  BEGINNER = 'Beginner',
  INTERMEDIATE = 'Intermediate',
  ADVANCED = 'Advanced'
}

export interface Topic {
  id: string;
  title: string;
  khmerTitle: string;
  emoji: string;
  description: string;
}

export interface AudioState {
  isPlaying: boolean;
  isListening: boolean;
  volume: number;
}