import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Pharmacy App Pages  
import PharmacyLanding from './pages/PharmacyLanding';
import PharmacyAuth from './pages/PharmacyAuth';
import PharmacyDashboard from '../../pages/PharmacyDashboard';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const PharmacyContext = React.createContext();

const PharmacyApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('pharmacy_token'));

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('pharmacy_token');
      if (savedToken) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        if (response.data.role === 'pharmacy') {
          setUser(response.data);
          setToken(savedToken);
        } else {
          localStorage.removeItem('pharmacy_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('pharmacy_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('pharmacy_token', authToken);
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('pharmacy_token');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <PharmacyContext.Provider value={{ user, token, login, logout, API }}>
      <Routes>
        <Route path="/" element={user ? <Navigate to="/pharmacy/dashboard" /> : <PharmacyLanding />} />
        <Route path="/auth" element={user ? <Navigate to="/pharmacy/dashboard" /> : <PharmacyAuth />} />
        <Route path="/dashboard" element={user ? <PharmacyDashboard /> : <Navigate to="/pharmacy/auth" />} />
      </Routes>
    </PharmacyContext.Provider>
  );
};

export default PharmacyApp;
