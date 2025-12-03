import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn as SignInFunction } from '../../services/authService';
import type { SignInCredentials } from '../../types/auth';
import styles from './SignInPage.module.css';
import { useAuth } from '../../context/AuthContext';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { signIn, isAuthenticated } = useAuth(); 

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const credentials: SignInCredentials = { email, password };

    try {
      const data = await SignInFunction(credentials);
      signIn(data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An Error Occur, Please Try Again!');
      }
      setIsLoading(false);
    } 
  };

  return (
    <div className={styles.loginContainer}>
      <h2>Sign In</h2>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email/Username</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {error && <p className={styles.errorText}>{error}</p>}

        <button 
          type="submit" 
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? 'Signing In' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}