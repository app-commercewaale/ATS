"use client";

import React, { createContext, useState, useEffect, useContext } from 'react';
import type { User } from '@/lib/types';
import { apiCall } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Call the real Apps Script backend
    const res = await apiCall("LOGIN", { email, password });

    if (!res.user) {
      throw new Error("Invalid response from login service.");
    }

    const loggedInUser: User = res.user;

    // Persist session
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    setUser(loggedInUser);

    // Dynamic redirect based on backend role
    if (loggedInUser.role === "ADMIN") {
      window.location.href = "/admin/dashboard";
    } else {
      window.location.href = "/employee/dashboard";
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}