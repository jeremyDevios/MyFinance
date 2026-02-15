import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import './Login.css';

export const Login = () => {
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Welcome to MyFinance</h2>
        <p>Please sign in to continue</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <button onClick={handleGoogleLogin} className="btn-google">
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
