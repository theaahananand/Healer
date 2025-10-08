import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PharmacyContext } from '../PharmacyApp';
import { Mail, Lock, User, Phone, Store, Pill, Eye, EyeOff, AlertCircle } from 'lucide-react';

const PharmacyAuth = () => {
  const navigate = useNavigate();
  const { login, API } = useContext(PharmacyContext);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState('email');
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('session_id=')) {
      const sessionId = hash.split('session_id=')[1].split('&')[0];
      handleGoogleAuth(sessionId);
    }
  }, []);

  const handleGoogleAuth = async (sessionId) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/google-session`, {}, {
        headers: { 'X-Session-ID': sessionId }
      });
      // For pharmacy accounts, we need phone number - redirect to complete profile
      if (response.data.user.role === 'customer') {
        // Update user role to pharmacy and prompt for phone
        setError('Please complete your pharmacy registration with required business details');
        window.history.replaceState({}, document.title, window.location.pathname);
        // Set form data from Google
        setFormData(prev => ({
          ...prev,
          name: response.data.user.name,
          email: response.data.user.email
        }));
        setIsLogin(false);
      } else {
        login(response.data.user, response.data.session_token || 'google-session');
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate('/pharmacy/dashboard');
      }
    } catch (err) {
      setError('Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = `${window.location.origin}/pharmacy/auth`;
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
        : { ...formData, role: 'pharmacy' };

      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data.user, response.data.token);
      navigate('/pharmacy/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setError('');
    try {
      if (resetStep === 'email') {
        const response = await axios.post(`${API}/auth/forgot-password`, null, {
          params: { email: resetEmail }
        });
        alert(`OTP sent to your email. For demo: ${response.data.otp}`);
        setResetStep('otp');
      } else if (resetStep === 'otp') {
        await axios.post(`${API}/auth/verify-otp`, null, {
          params: { email: resetEmail, otp }
        });
        setResetStep('password');
      } else if (resetStep === 'password') {
        await axios.post(`${API}/auth/reset-password`, null, {
          params: { email: resetEmail, otp, new_password: newPassword }
        });
        alert('Password reset successful! Please login.');
        setShowForgotPassword(false);
        setResetStep('email');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="logo"><Pill size={40} /></div>
          <h1>Forgot Password</h1>
          <p>Reset your password</p>

          {error && <div className="error"><AlertCircle size={16} />{error}</div>}

          {resetStep === 'email' && (
            <div>
              <div className="form-group">
                <label><Mail size={18} /> Email Address *</label>
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
              </div>
              <button onClick={handleForgotPassword} disabled={loading} className="btn-submit">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          )}

          {resetStep === 'otp' && (
            <div>
              <div className="form-group">
                <label><Lock size={18} /> Enter OTP *</label>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength="6" required />
              </div>
              <button onClick={handleForgotPassword} disabled={loading} className="btn-submit">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
          )}

          {resetStep === 'password' && (
            <div>
              <div className="form-group">
                <label><Lock size={18} /> New Password *</label>
                <div className="password-input">
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <small className="hint">Min 6 chars with special character</small>
              </div>
              <button onClick={handleForgotPassword} disabled={loading} className="btn-submit">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          )}

          <p className="toggle"><button onClick={() => { setShowForgotPassword(false); setError(''); }}>Back to Login</button></p>
        </div>

        <style jsx>{`
          .auth-page { min-height: 100vh; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); display: flex; align-items: center; justify-content: center; padding: 24px; }
          .auth-card { background: white; border-radius: 24px; padding: 48px; max-width: 450px; width: 100%; text-align: center; }
          .logo { width: 70px; height: 70px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: white; }
          h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
          p { color: #64748b; margin-bottom: 24px; }
          .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
          .form-group { margin-bottom: 20px; text-align: left; }
          .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px; }
          .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px; }
          .form-group input:focus { outline: none; border-color: #8b5cf6; }
          .password-input { position: relative; }
          .password-input input { padding-right: 45px; }
          .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #64748b; cursor: pointer; }
          .hint { font-size: 12px; color: #9ca3af; display: block; margin-top: 4px; }
          .btn-submit { width: 100%; padding: 14px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; }
          .btn-submit:disabled { opacity: 0.6; }
          .toggle { margin-top: 24px; color: #64748b; }
          .toggle button { background: none; border: none; color: #8b5cf6; font-weight: 600; cursor: pointer; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo"><Pill size={40} /></div>
        <h1>Healer Business</h1>
        <p>{isLogin ? 'Sign in to your pharmacy account' : 'Register your pharmacy'}</p>

        {error && <div className="error" data-testid="error-message"><AlertCircle size={16} />{error}</div>}

        {isLogin && (
          <>
            <button className="btn-google" onClick={handleGoogleLogin} data-testid="google-login-btn">
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
            <div className="divider"><span>or</span></div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label><Store size={18} /> Business Name <span className="required">*</span></label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="name-input" placeholder="Enter business name" />
            </div>
          )}

          <div className="form-group">
            <label><Mail size={18} /> Email <span className="required">*</span></label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required data-testid="email-input" placeholder="business@example.com" />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label><Phone size={18} /> Phone <span className="required">*</span></label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} required data-testid="phone-input" placeholder="+91 98765 43210" />
            </div>
          )}

          <div className="form-group">
            <label><Lock size={18} /> Password <span className="required">*</span> {!isLogin && <span className="hint-inline">(Min 6 chars + special)</span>}</label>
            <div className="password-input">
              <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required data-testid="password-input" placeholder="Enter password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isLogin && (
            <div className="forgot-link">
              <button type="button" onClick={() => setShowForgotPassword(true)}>Forgot Password?</button>
            </div>
          )}

          <button type="submit" disabled={loading} data-testid="submit-btn" className="btn-submit">
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} data-testid="toggle-mode">{isLogin ? 'Sign Up' : 'Sign In'}</button>
        </p>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100vh; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .auth-card { background: white; border-radius: 24px; padding: 48px; max-width: 450px; width: 100%; text-align: center; }
        .logo { width: 70px; height: 70px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: white; }
        h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        p { color: #64748b; margin-bottom: 24px; }
        .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .btn-google { width: 100%; padding: 14px; border: 2px solid #e5e7eb; border-radius: 12px; background: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px; transition: all 0.3s; margin-bottom: 20px; }
        .btn-google:hover { background: #f9fafb; }
        .google-icon { width: 20px; height: 20px; }
        .divider { display: flex; align-items: center; margin: 24px 0; color: #9ca3af; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
        .divider span { padding: 0 16px; }
        .form-group { margin-bottom: 20px; text-align: left; }
        .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px; }
        .required { color: #ef4444; }
        .hint-inline { font-size: 12px; color: #9ca3af; font-weight: 400; margin-left: auto; }
        .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px; }
        .form-group input:focus { outline: none; border-color: #8b5cf6; }
        .password-input { position: relative; }
        .password-input input { padding-right: 45px; }
        .eye-btn { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #64748b; cursor: pointer; }
        .forgot-link { text-align: right; margin-bottom: 16px; }
        .forgot-link button { background: none; border: none; color: #8b5cf6; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-submit { width: 100%; padding: 14px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; }
        .btn-submit:disabled { opacity: 0.6; }
        .toggle { margin-top: 24px; color: #64748b; }
        .toggle button { background: none; border: none; color: #8b5cf6; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default PharmacyAuth;