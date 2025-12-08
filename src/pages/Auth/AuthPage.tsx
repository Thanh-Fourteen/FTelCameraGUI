import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  // --- STATE ---
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLoginMode) {
        await signIn({ email, password });
      } else {
        await signUp({ email, password, name: fullName });
      }
      navigate('/');
    } catch (error) {
      alert("Authentication failed!");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
  };

  // --- RENDER ---
  return (
    <div style={styles.container}>
      
      {/* --- NÚT QUAY VỀ TRANG CHỦ --- */}
      <button 
        style={styles.backHomeBtn} 
        onClick={() => navigate('/')}
        title="Back to Home"
      >
        ← Home
      </button>

      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logo}>👁️</div>
          <h2 style={styles.title}>
            {isLoginMode ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p style={styles.subtitle}>
            {isLoginMode 
              ? 'Enter your credentials to access your camera system.' 
              : 'Register to manage your smart surveillance system.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {!isLoginMode && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input 
                type="text" style={styles.input} placeholder="e.g. John Doe"
                value={fullName} onChange={(e) => setFullName(e.target.value)}
                required={!isLoginMode}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input 
              type="email" style={styles.input} placeholder="admin@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input 
              type="password" style={styles.input} placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
          </div>

          <button 
            type="submit" 
            style={{
              ...styles.button, 
              opacity: isLoading ? 0.7 : 1, 
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            {isLoginMode ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button onClick={toggleMode} style={styles.linkBtn}>
            {isLoginMode ? "Sign Up" : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- STYLES ĐÃ SỬA ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    fontFamily: 'Inter, sans-serif',
    
    // --- FIX CĂN GIỮA & SCROLLBAR ---
    minHeight: '100vh',       // Chiếm ít nhất 100% chiều cao màn hình
    padding: '20px',          // Padding nhỏ để không bị dính mép trên mobile
    boxSizing: 'border-box',  // QUAN TRỌNG: Để padding không cộng thêm vào height gây scroll
    position: 'relative',     // Để đặt nút Back tuyệt đối theo khung này
  },

  // Style cho nút Quay lại trang chủ
  backHomeBtn: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    background: 'transparent',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'color 0.2s',
    zIndex: 10,
  },

  card: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '16px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', // Shadow đậm hơn chút cho nổi
    width: '100%',
    maxWidth: '420px',
    // Đảm bảo card không bị dính sát lề khi màn hình quá nhỏ
    margin: '0 auto',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  logo: {
    fontSize: '48px',
    marginBottom: '10px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: '1.5',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
    width: '100%',
    boxSizing: 'border-box',
  },
  button: {
    marginTop: '10px',
    padding: '12px',
    backgroundColor: '#2563eb', 
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  footerText: {
    color: '#64748b',
    margin: 0,
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
  }
};

export default AuthPage;