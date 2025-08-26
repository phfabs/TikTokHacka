export interface User {
    id: string;
    email: string;
    name?: string;
  }
  
  export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  }
  
  export interface SkillPlan {
    id: string;
    skillName: string;
    createdAt: string;
    days: SkillDay[];
  }
  
  export interface SkillDay {
    day: number;
    title: string;
    description: string;
    tasks: string[];
    timeEstimate: string;
    completed: boolean;
  }