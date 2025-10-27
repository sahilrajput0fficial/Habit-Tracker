import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Get theme from localStorage on initial load
    if (typeof window === 'undefined') return 'light';
    try {
      const saved = localStorage.getItem('theme');
      // Only return saved theme if it's explicitly 'dark', otherwise default to 'light'
      return (saved === 'dark') ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    // Apply theme to document root
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');

    // Save theme to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('theme', theme);
      } catch (e) {
        console.warn('Failed to save theme to localStorage', e);
      }
    }
  }, [theme]);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme);
        }
      } catch (e) {
        console.warn('Failed to load theme from localStorage', e);
      }
    }
  }, []);

  useEffect(() => {
    // Listen for theme changes from AuthContext
    if (typeof window === 'undefined') return;

    const handleThemeChange = (event: CustomEvent<Theme>) => {
      setTheme(event.detail);
    };

    window.addEventListener('themeChange', handleThemeChange as EventListener);

    return () => {
      window.removeEventListener('themeChange', handleThemeChange as EventListener);
    };
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    // Save to localStorage immediately
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('theme', newTheme);
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('themeChange', { detail: newTheme }));
      } catch (e) {
        console.warn('Failed to save theme to localStorage', e);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
