import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  signIn: (data: any) => Promise<void>;
  signUp: (data: any) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lấy trạng thái từ localStorage để khi F5 không bị mất login
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('IS_AUTH') === 'true';
  });
  
  const [user, setUser] = useState<any>(null);

  const signIn = async (data: any) => {
    console.log("Login with:", data);
    // Giả lập API call
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsAuthenticated(true);
        setUser({ name: 'Admin User', role: 'Super Admin' });
        localStorage.setItem('IS_AUTH', 'true');
        resolve();
      }, 500);
    });
  };

  const signUp = async (data: any) => {
    console.log("Register with:", data);
    // Giả lập đăng ký xong tự login luôn
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setIsAuthenticated(true);
        setUser({ name: data.name, role: 'User' });
        localStorage.setItem('IS_AUTH', 'true');
        resolve();
      }, 500);
    });
  };

  const signOut = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('IS_AUTH');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};