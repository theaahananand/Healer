import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Customer App Pages
import CustomerLanding from './pages/CustomerLanding';
import CustomerAuth from './pages/CustomerAuth';
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerProfile from './pages/CustomerProfile';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const CustomerContext = React.createContext();

const CustomerApp = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('customer_token'));

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('customer_token');
      if (savedToken) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        if (response.data.role === 'customer') {
          setUser(response.data);
          setToken(savedToken);
        } else {
          localStorage.removeItem('customer_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('customer_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('customer_token', authToken);
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
      localStorage.removeItem('customer_token');
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
    <CustomerContext.Provider value={{ user, token, login, logout, API }}>
      <Routes>
        <Route path="/" element={user ? <CustomerDashboard /> : <CustomerLanding />} />
        <Route path="/auth" element={user ? <Navigate to="/customer" /> : <CustomerAuth />} />
        <Route path="/dashboard" element={user ? <CustomerDashboard /> : <Navigate to="/customer/auth" />} />
      </Routes>
    </CustomerContext.Provider>
  );
};

export default CustomerApp;
