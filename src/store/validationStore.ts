import { create } from 'zustand';
import type { Issue } from '../validation';

type ValidationState = {
  issues: Issue[];
  setIssues: (issues: Issue[]) => void;
};

export const useValidationStore = create<ValidationState>()((set) => ({
  issues: [],
  setIssues: (issues) => set({ issues }),
}));
