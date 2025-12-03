import { 
  createContext, 
  useContext, 
  useState, 
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('authToken')
  );
  
  const navigate = useNavigate();

  const isAuthenticated = !!token;

  const signIn = (newToken: string) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  };

  const signOut = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    navigate('/');
  };

  const value = {
    isAuthenticated,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used in AuthProvider');
  }
  return context;
}