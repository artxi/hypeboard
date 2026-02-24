import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserContextType {
  username: string | null;
  setUsername: (username: string) => void;
  clearUsername: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USERNAME_KEY = 'hypeboard_username';

export function UserProvider({ children }: { children: ReactNode }) {
  const [username, setUsernameState] = useState<string | null>(() => {
    // Initialize from localStorage
    return localStorage.getItem(USERNAME_KEY);
  });

  const setUsername = (newUsername: string) => {
    localStorage.setItem(USERNAME_KEY, newUsername);
    setUsernameState(newUsername);
  };

  const clearUsername = () => {
    localStorage.removeItem(USERNAME_KEY);
    setUsernameState(null);
  };

  return (
    <UserContext.Provider value={{ username, setUsername, clearUsername }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
