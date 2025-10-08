import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import "./App.css";

// Import pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import PharmacyDashboard from "./pages/PharmacyDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import SearchMedicines from "./pages/SearchMedicines";
import OrderTracking from "./pages/OrderTracking";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        setUser(response.data);
        setToken(savedToken);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
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
      localStorage.removeItem('token');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Healer...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, API }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/:role" element={<AuthPage />} />
          
          {/* Protected Routes */}
          <Route
            path="/customer/*"
            element={user?.role === 'customer' ? <CustomerDashboard /> : <Navigate to="/auth/customer" />}
          />
          <Route
            path="/pharmacy/*"
            element={user?.role === 'pharmacy' ? <PharmacyDashboard /> : <Navigate to="/auth/pharmacy" />}
          />
          <Route
            path="/driver/*"
            element={user?.role === 'driver' ? <DriverDashboard /> : <Navigate to="/auth/driver" />}
          />
          
          {/* Shared Routes */}
          <Route path="/search" element={<SearchMedicines />} />
          <Route path="/track/:orderId" element={<OrderTracking />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
