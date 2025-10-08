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