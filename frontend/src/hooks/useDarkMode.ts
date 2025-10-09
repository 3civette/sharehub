import { useEffect, useState } from 'react';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(true); // Default to dark mode

  useEffect(() => {
    // Check localStorage for saved preference
    const saved = localStorage.getItem('darkMode');
    // Default to true (dark mode) if no preference is saved
    const initialValue = saved === null ? true : saved === 'true';
    setIsDark(initialValue);

    // Apply dark class to root element
    if (initialValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Save default preference if not set
    if (saved === null) {
      localStorage.setItem('darkMode', 'true');
    }
  }, []);

  const toggleDarkMode = () => {
    const newValue = !isDark;
    setIsDark(newValue);

    if (newValue) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  return { isDark, toggleDarkMode };
}
