import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DriverContext } from '../DriverApp';
import { Mail, Lock, User, Phone, Pill } from 'lucide-react';

const DriverAuth = () => {
  const navigate = useNavigate();
  const { login, API } = useContext(DriverContext);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
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
        : { ...formData, role: 'driver' };

      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data.user, response.data.token);
      navigate('/driver/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo"><Pill size={40} /></div>
        <h1>Healer Delivery</h1>
        <p>{isLogin ? 'Sign in to your driver account' : 'Become a delivery partner'}</p>

        {error && <div className="error" data-testid="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label><User size={18} /> Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required data-testid="name-input" />
            </div>
          )}

          <div className="form-group">
            <label><Mail size={18} /> Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required data-testid="email-input" />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label><Phone size={18} /> Phone</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} data-testid="phone-input" />
            </div>
          )}

          <div className="form-group">
            <label><Lock size={18} /> Password</label>
            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required data-testid="password-input" />
          </div>

          <button type="submit" disabled={loading} data-testid="submit-btn">
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setIsLogin(!isLogin)} data-testid="toggle-mode">{isLogin ? 'Sign Up' : 'Sign In'}</button>
        </p>
      </div>

      <style jsx>{`
        .auth-page { min-height: 100vh; background: linear-gradient(135deg, #10b981 0%, #059669 100%); display: flex; align-items: center; justify-content: center; padding: 24px; }
        .auth-card { background: white; border-radius: 24px; padding: 48px; max-width: 450px; width: 100%; text-align: center; }
        .logo { width: 70px; height: 70px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; color: white; }
        h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        p { color: #64748b; margin-bottom: 24px; }
        .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; }
        .form-group { margin-bottom: 20px; text-align: left; }
        .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px; }
        .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px; }
        .form-group input:focus { outline: none; border-color: #10b981; }
        button[type="submit"] { width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; }
        button[type="submit"]:disabled { opacity: 0.6; }
        .toggle { margin-top: 24px; color: #64748b; }
        .toggle button { background: none; border: none; color: #10b981; font-weight: 600; cursor: pointer; }
      `}</style>
    </div>
  );
};

export default DriverAuth;