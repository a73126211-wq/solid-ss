import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AppNotification {
  id: number;
  title: string;
  body: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id'>) => void;
  removeNotification: (id: number) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((n: Omit<AppNotification, 'id'>) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { ...n, id }]);
    const delay = n.type === 'error' ? 6000 : 4000;
    setTimeout(() => {
      setNotifications((prev) => prev.filter((x) => x.id !== id));
    }, delay);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, removeNotification, clearNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}
