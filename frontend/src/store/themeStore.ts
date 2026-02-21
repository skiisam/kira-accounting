import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ThemeColor = 'default' | 'blue' | 'green' | 'purple';

interface ThemeState {
  mode: ThemeMode;
  color: ThemeColor;
  setMode: (mode: ThemeMode) => void;
  setColor: (color: ThemeColor) => void;
  isDark: boolean;
  updateSystemTheme: () => void;
}

const getSystemTheme = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const applyTheme = (isDark: boolean, color: ThemeColor) => {
  const root = document.documentElement;
  const body = document.body;
  
  // Remove existing theme classes
  root.classList.remove('dark', 'theme-default', 'theme-blue', 'theme-green', 'theme-purple');
  body.classList.remove('dark', 'theme-default', 'theme-blue', 'theme-green', 'theme-purple');
  
  // Apply dark mode
  if (isDark) {
    root.classList.add('dark');
    body.classList.add('dark');
  }
  
  // Apply color theme
  root.classList.add(`theme-${color}`);
  body.classList.add(`theme-${color}`);
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'auto',
      color: 'default',
      isDark: getSystemTheme(),
      
      setMode: (mode: ThemeMode) => {
        let isDark: boolean;
        
        if (mode === 'auto') {
          isDark = getSystemTheme();
        } else {
          isDark = mode === 'dark';
        }
        
        applyTheme(isDark, get().color);
        set({ mode, isDark });
      },
      
      setColor: (color: ThemeColor) => {
        applyTheme(get().isDark, color);
        set({ color });
      },
      
      updateSystemTheme: () => {
        const state = get();
        if (state.mode === 'auto') {
          const isDark = getSystemTheme();
          applyTheme(isDark, state.color);
          set({ isDark });
        }
      },
    }),
    {
      name: 'kira-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on rehydration
          let isDark: boolean;
          if (state.mode === 'auto') {
            isDark = getSystemTheme();
          } else {
            isDark = state.mode === 'dark';
          }
          applyTheme(isDark, state.color || 'default');
          state.isDark = isDark;
        }
      },
    }
  )
);

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    useThemeStore.getState().updateSystemTheme();
  });
}
