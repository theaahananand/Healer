import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DriverContext } from '../apps/driver/DriverApp';
import { Truck, Package, User, LogOut, MapPin, CheckCircle } from 'lucide-react';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, API, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('deliveries');
  const [driverProfile, setDriverProfile] = useState(null);
  const [myDeliveries, setMyDeliveries] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(false);

  const [driverForm, setDriverForm] = useState({
    vehicle_type: '',
    license_number: '',
    vehicle_number: ''
  });

  useEffect(() => {
    fetchDriverProfile();
  }, []);

  const fetchDriverProfile = async () => {
    try {
      const response = await axios.get(`${API}/drivers/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDriverProfile(response.data);
      fetchMyDeliveries();
    } catch (error) {
      if (error.response?.status === 404) {
        setShowSetup(true);
      }
    }
  };

  const fetchMyDeliveries = async () => {
    try {
      const response = await axios.get(`${API}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyDeliveries(response.data);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    }
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/drivers`, driverForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSetup(false);
      fetchDriverProfile();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create driver profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, null, {
        params: { status },
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMyDeliveries();
      alert(`Order status updated to ${status}`);
    } catch (error) {
      alert('Failed to update status');
    }
  };

  if (showSetup) {
    return (
      <div className="setup-page">
        <div className="setup-container">
          <h1>Setup Driver Profile</h1>
          <p className="setup-subtitle">Complete your profile to start accepting deliveries</p>
          
          <form onSubmit={handleCreateProfile} className="setup-form">
            <div className="form-group">
              <label className="input-label">Vehicle Type</label>
              <select
                className="input-field"
                value={driverForm.vehicle_type}
                onChange={(e) => setDriverForm({ ...driverForm, vehicle_type: e.target.value })}
                required
                data-testid="vehicle-type-input"
              >
                <option value="">Select vehicle type</option>
                <option value="Bike">Bike</option>
                <option value="Scooter">Scooter</option>
                <option value="Car">Car</option>
              </select>
            </div>

            <div className="form-group">
              <label className="input-label">License Number</label>
              <input
                type="text"
                className="input-field"
                value={driverForm.license_number}
                onChange={(e) => setDriverForm({ ...driverForm, license_number: e.target.value })}
                required
                data-testid="license-input"
              />
            </div>

            <div className="form-group">
              <label className="input-label">Vehicle Number</label>
              <input
                type="text"
                className="input-field"
                value={driverForm.vehicle_number}
                onChange={(e) => setDriverForm({ ...driverForm, vehicle_number: e.target.value })}
                required
                data-testid="vehicle-number-input"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} data-testid="create-profile-btn">
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
          </form>
        </div>

        <style jsx>{`
          .setup-page {
            min-height: 100vh;
            background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .setup-container {
            background: white;
            border-radius: 24px;
            padding: 48px;
            max-width: 500px;
            width: 100%;
          }

          .setup-container h1 {
            font-size: 32px;
            font-weight: 800;
            color: #1e293b;
            margin-bottom: 8px;
          }

          .setup-subtitle {
            color: #64748b;
            margin-bottom: 32px;
          }

          .setup-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .btn-full {
            width: 100%;
            margin-top: 8px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <h2>Healer Driver</h2>
            <span className="user-badge">Delivery Partner</span>
          </div>
          <button className="btn-logout" onClick={logout} data-testid="logout-btn">
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-container">
        <div className="dashboard-sidebar">
          <button 
            className={`sidebar-btn ${activeTab === 'deliveries' ? 'active' : ''}`}
            onClick={() => setActiveTab('deliveries')}
            data-testid="tab-deliveries"
          >
            <Package size={20} />
            My Deliveries
            {myDeliveries.length > 0 && <span className="badge">{myDeliveries.length}</span>}
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            data-testid="tab-profile"
          >
            <User size={20} />
            Profile
          </button>
        </div>

        <div className="dashboard-main">
          {/* Deliveries Tab */}
          {activeTab === 'deliveries' && (
            <div className="tab-content">
              <h1 className="page-title">My Deliveries</h1>
              
              {myDeliveries.length === 0 ? (
                <p className="empty-message">No deliveries assigned yet.</p>
              ) : (
                <div className="deliveries-list">
                  {myDeliveries.map((delivery, index) => (
                    <div key={delivery.id} className="delivery-card" data-testid={`delivery-card-${index}`}>
                      <div className="delivery-header">
                        <div>
                          <h3>Delivery #{delivery.id.substring(0, 8)}</h3>
                          <p className="delivery-date">{new Date(delivery.created_at).toLocaleString()}</p>
                        </div>
                        <span className={`status-badge status-${delivery.status}`}>
                          {delivery.status}
                        </span>
                      </div>

                      <div className="delivery-info">
                        <div className="info-item">
                          <MapPin size={18} />
                          <div>
                            <p className="info-label">Delivery Address</p>
                            <p className="info-value">{delivery.delivery_address.address}</p>
                          </div>
                        </div>
                        <div className="info-item">
                          <Package size={18} />
                          <div>
                            <p className="info-label">Items</p>
                            <p className="info-value">{delivery.items.length} item(s)</p>
                          </div>
                        </div>
                      </div>

                      <div className="delivery-actions">
                        {delivery.status === 'accepted' && (
                          <button 
                            className="btn btn-primary btn-small"
                            onClick={() => handleUpdateStatus(delivery.id, 'picked_up')}
                            data-testid={`pickup-btn-${index}`}
                          >
                            <CheckCircle size={16} />
                            Mark Picked Up
                          </button>
                        )}
                        {delivery.status === 'picked_up' && (
                          <button 
                            className="btn btn-primary btn-small"
                            onClick={() => handleUpdateStatus(delivery.id, 'in_transit')}
                          >
                            <Truck size={16} />
                            On the Way
                          </button>
                        )}
                        {delivery.status === 'in_transit' && (
                          <button 
                            className="btn btn-success btn-small"
                            onClick={() => handleUpdateStatus(delivery.id, 'delivered')}
                            data-testid={`deliver-btn-${index}`}
                          >
                            <CheckCircle size={16} />
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && driverProfile && (
            <div className="tab-content">
              <h1 className="page-title">Driver Profile</h1>
              <div className="profile-card">
                <div className="profile-avatar">
                  <Truck size={48} />
                </div>
                <div className="profile-info">
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                  <p><strong>Vehicle Type:</strong> {driverProfile.vehicle_type}</p>
                  <p><strong>License Number:</strong> {driverProfile.license_number}</p>
                  <p><strong>Vehicle Number:</strong> {driverProfile.vehicle_number}</p>
                  <p><strong>Status:</strong> {driverProfile.is_available ? 'Available' : 'Busy'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          min-height: 100vh;
          background: #f8fafc;
        }

        .dashboard-nav {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 16px 0;
          position: sticky;
          top: 0;
          z-index: 50;
        }

        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-brand h2 {
          color: #0ea5e9;
          font-size: 24px;
          font-weight: 700;
        }

        .user-badge {
          background: #e0f2fe;
          color: #0369a1;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
        }

        .btn-logout {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #fee2e2;
          color: #991b1b;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .dashboard-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 24px;
        }

        .dashboard-sidebar {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sidebar-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          background: white;
          border: 2px solid transparent;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: left;
        }

        .sidebar-btn:hover {
          background: #f1f5f9;
          color: #0ea5e9;
        }

        .sidebar-btn.active {
          background: #0ea5e9;
          color: white;
        }

        .badge {
          margin-left: auto;
          background: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 12px;
        }

        .sidebar-btn.active .badge {
          background: white;
          color: #0ea5e9;
        }

        .dashboard-main {
          background: white;
          border-radius: 16px;
          padding: 32px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 24px;
        }

        .deliveries-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .delivery-card {
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }

        .delivery-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .delivery-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .delivery-date {
          font-size: 14px;
          color: #64748b;
          margin-top: 4px;
        }

        .delivery-info {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 20px;
        }

        .info-item {
          display: flex;
          gap: 12px;
          align-items: start;
          color: #64748b;
        }

        .info-label {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 14px;
          color: #1e293b;
          font-weight: 600;
        }

        .delivery-actions {
          display: flex;
          gap: 12px;
        }

        .btn-small {
          padding: 10px 20px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .profile-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 32px;
          max-width: 600px;
        }

        .profile-avatar {
          width: 100px;
          height: 100px;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin: 0 auto 24px;
        }

        .profile-info p {
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
          color: #64748b;
        }

        .profile-info p:last-child {
          border-bottom: none;
        }

        .empty-message {
          text-align: center;
          color: #64748b;
          padding: 48px;
        }

        @media (max-width: 1024px) {
          .dashboard-container {
            grid-template-columns: 1fr;
          }

          .dashboard-sidebar {
            flex-direction: row;
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverDashboard;
