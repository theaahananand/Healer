import React, { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import { Mail, Lock, User, Phone, Building2, Pill } from 'lucide-react';

const AuthPage = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const { login, API } = useContext(AuthContext);
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  // Check for Google OAuth session_id in URL fragment
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1].split('&')[0];
      handleGoogleAuth(sessionId);
    }
  }, []);

  const handleGoogleAuth = async (sessionId) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/auth/google-session`, {}, {
        headers: { 'X-Session-ID': sessionId }
      });
      
      login(response.data.user, response.data.session_token || 'google-session');
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Navigate to appropriate dashboard
      navigate(`/${response.data.user.role}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = `${window.location.origin}/auth/customer`;
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { ...formData, role };

      const response = await axios.post(`${API}${endpoint}`, payload);
      
      login(response.data.user, response.data.token);
      navigate(`/${role}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getRoleTitle = () => {
    switch(role) {
      case 'customer': return 'Customer';
      case 'pharmacy': return 'Pharmacy Owner';
      case 'driver': return 'Delivery Partner';
      default: return '';
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Pill size={40} />
            </div>
            <h1 className="auth-title" data-testid="auth-title">
              {isLogin ? 'Welcome Back' : 'Join Healer'}
            </h1>
            <p className="auth-subtitle" data-testid="auth-subtitle">
              {isLogin ? `Sign in as ${getRoleTitle()}` : `Create ${getRoleTitle()} account`}
            </p>
          </div>

          {error && (
            <div className="error-message" data-testid="error-message">
              {error}
            </div>
          )}

          {/* Google Login - Only for customers */}
          {role === 'customer' && isLogin && (
            <div className="social-login">
              <button 
                className="btn-google" 
                onClick={handleGoogleLogin}
                data-testid="google-login-btn"
              >
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="divider">
                <span>or</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label className="input-label">
                  <User size={18} />
                  {role === 'pharmacy' ? 'Business Name' : 'Full Name'}
                </label>
                <input
                  type="text"
                  name="name"
                  className="input-field"
                  placeholder={role === 'pharmacy' ? 'Enter business name' : 'Enter your name'}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  data-testid="name-input"
                />
              </div>
            )}

            <div className="form-group">
              <label className="input-label">
                <Mail size={18} />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                className="input-field"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
                data-testid="email-input"
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label className="input-label">
                  <Phone size={18} />
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="input-field"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={handleChange}
                  data-testid="phone-input"
                />
              </div>
            )}

            <div className="form-group">
              <label className="input-label">
                <Lock size={18} />
                Password
              </label>
              <input
                type="password"
                name="password"
                className="input-field"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                data-testid="password-input"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full" 
              disabled={loading}
              data-testid="auth-submit-btn"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                className="link-button" 
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                }}
                data-testid="toggle-auth-mode"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          <div className="auth-role-switcher">
            <p className="role-text">Switch Role:</p>
            <div className="role-buttons">
              <button 
                className={`role-btn ${role === 'customer' ? 'active' : ''}`}
                onClick={() => navigate('/auth/customer')}
                data-testid="switch-customer"
              >
                Customer
              </button>
              <button 
                className={`role-btn ${role === 'pharmacy' ? 'active' : ''}`}
                onClick={() => navigate('/auth/pharmacy')}
                data-testid="switch-pharmacy"
              >
                Pharmacy
              </button>
              <button 
                className={`role-btn ${role === 'driver' ? 'active' : ''}`}
                onClick={() => navigate('/auth/driver')}
                data-testid="switch-driver"
              >
                Driver
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .auth-container {
          width: 100%;
          max-width: 480px;
        }

        .auth-card {
          background: white;
          border-radius: 24px;
          padding: 48px 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .auth-logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: white;
        }

        .auth-title {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .auth-subtitle {
          font-size: 16px;
          color: #64748b;
        }

        .error-message {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 14px;
          font-weight: 500;
        }

        .social-login {
          margin-bottom: 24px;
        }

        .btn-google {
          width: 100%;
          padding: 14px 24px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          transition: all 0.3s ease;
        }

        .btn-google:hover {
          border-color: #d1d5db;
          background: #f9fafb;
        }

        .google-icon {
          width: 20px;
          height: 20px;
        }

        .divider {
          display: flex;
          align-items: center;
          margin: 24px 0;
          color: #9ca3af;
          font-size: 14px;
        }

        .divider::before,
        .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e5e7eb;
        }

        .divider span {
          padding: 0 16px;
        }

        .auth-form {
          margin-bottom: 24px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .btn-full {
          width: 100%;
          padding: 14px;
          font-size: 16px;
          margin-top: 8px;
        }

        .auth-footer {
          text-align: center;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .auth-footer p {
          color: #64748b;
          font-size: 15px;
        }

        .link-button {
          background: none;
          border: none;
          color: #0ea5e9;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          padding: 0;
          font-size: 15px;
        }

        .link-button:hover {
          text-decoration: underline;
        }

        .auth-role-switcher {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
        }

        .role-text {
          text-align: center;
          color: #64748b;
          font-size: 14px;
          margin-bottom: 12px;
        }

        .role-buttons {
          display: flex;
          gap: 8px;
        }

        .role-btn {
          flex: 1;
          padding: 10px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          background: white;
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .role-btn:hover {
          border-color: #0ea5e9;
          color: #0ea5e9;
        }

        .role-btn.active {
          background: #0ea5e9;
          border-color: #0ea5e9;
          color: white;
        }

        @media (max-width: 640px) {
          .auth-card {
            padding: 32px 24px;
          }

          .auth-title {
            font-size: 28px;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthPage;
