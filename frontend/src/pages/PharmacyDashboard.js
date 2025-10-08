import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PharmacyContext } from '../apps/pharmacy/PharmacyApp';
import { Store, Package, ShoppingBag, Settings, LogOut, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';

// Fix: Export PharmacyContext from the PharmacyApp file
export { PharmacyContext } from '../apps/pharmacy/PharmacyApp';

const PharmacyDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, API, token } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('medicines');
  const [pharmacy, setPharmacy] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showAddMedicine, setShowAddMedicine] = useState(false);
  const [showPharmacySetup, setShowPharmacySetup] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pharmacyForm, setPharmacyForm] = useState({
    business_name: '',
    location: { lat: 28.6139, lng: 77.2090, address: '' },
    contact_phone: '',
    operating_hours: '9:00 AM - 9:00 PM',
    license_number: ''
  });

  const [medicineForm, setMedicineForm] = useState({
    name: '',
    description: '',
    price: '',
    stock_quantity: '',
    category: '',
    requires_prescription: false
  });

  useEffect(() => {
    fetchPharmacy();
  }, []);

  const fetchPharmacy = async () => {
    try {
      const response = await axios.get(`${API}/pharmacies/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPharmacy(response.data);
      fetchMedicines();
      fetchOrders();
    } catch (error) {
      if (error.response?.status === 404) {
        setShowPharmacySetup(true);
      }
    }
  };

  const fetchMedicines = async () => {
    try {
      const response = await axios.get(`${API}/medicines/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedicines(response.data);
    } catch (error) {
      console.error('Failed to fetch medicines:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleCreatePharmacy = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/pharmacies`, pharmacyForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowPharmacySetup(false);
      fetchPharmacy();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create pharmacy');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/medicines`, {
        ...medicineForm,
        price: parseFloat(medicineForm.price),
        stock_quantity: parseInt(medicineForm.stock_quantity)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddMedicine(false);
      setMedicineForm({
        name: '',
        description: '',
        price: '',
        stock_quantity: '',
        category: '',
        requires_prescription: false
      });
      fetchMedicines();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedicine = async (id) => {
    if (!window.confirm('Are you sure you want to delete this medicine?')) return;
    
    try {
      await axios.delete(`${API}/medicines/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchMedicines();
    } catch (error) {
      alert('Failed to delete medicine');
    }
  };

  const handleOrderAction = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, null, {
        params: { status },
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchOrders();
      alert(`Order ${status === 'accepted' ? 'accepted' : 'rejected'} successfully`);
    } catch (error) {
      alert('Failed to update order status');
    }
  };

  if (showPharmacySetup) {
    return (
      <div className="setup-page">
        <div className="setup-container">
          <h1>Setup Your Pharmacy</h1>
          <p className="setup-subtitle">Complete your pharmacy profile to start receiving orders</p>
          
          <form onSubmit={handleCreatePharmacy} className="setup-form">
            <div className="form-group">
              <label className="input-label">Business Name</label>
              <input
                type="text"
                className="input-field"
                value={pharmacyForm.business_name}
                onChange={(e) => setPharmacyForm({ ...pharmacyForm, business_name: e.target.value })}
                required
                data-testid="business-name-input"
              />
            </div>

            <div className="form-group">
              <label className="input-label">Address</label>
              <input
                type="text"
                className="input-field"
                value={pharmacyForm.location.address}
                onChange={(e) => setPharmacyForm({ 
                  ...pharmacyForm, 
                  location: { ...pharmacyForm.location, address: e.target.value }
                })}
                required
                data-testid="address-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="input-label">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="input-field"
                  value={pharmacyForm.location.lat}
                  onChange={(e) => setPharmacyForm({ 
                    ...pharmacyForm, 
                    location: { ...pharmacyForm.location, lat: parseFloat(e.target.value) }
                  })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="input-label">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="input-field"
                  value={pharmacyForm.location.lng}
                  onChange={(e) => setPharmacyForm({ 
                    ...pharmacyForm, 
                    location: { ...pharmacyForm.location, lng: parseFloat(e.target.value) }
                  })}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Contact Phone</label>
              <input
                type="tel"
                className="input-field"
                value={pharmacyForm.contact_phone}
                onChange={(e) => setPharmacyForm({ ...pharmacyForm, contact_phone: e.target.value })}
                required
                data-testid="phone-input"
              />
            </div>

            <div className="form-group">
              <label className="input-label">Operating Hours</label>
              <input
                type="text"
                className="input-field"
                value={pharmacyForm.operating_hours}
                onChange={(e) => setPharmacyForm({ ...pharmacyForm, operating_hours: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="input-label">License Number</label>
              <input
                type="text"
                className="input-field"
                value={pharmacyForm.license_number}
                onChange={(e) => setPharmacyForm({ ...pharmacyForm, license_number: e.target.value })}
                required
                data-testid="license-input"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={loading} data-testid="create-pharmacy-btn">
              {loading ? 'Creating...' : 'Create Pharmacy'}
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
            max-width: 600px;
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

          .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
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
            <h2>Healer Pharmacy</h2>
            {pharmacy && <span className="user-badge">{pharmacy.business_name}</span>}
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
            className={`sidebar-btn ${activeTab === 'medicines' ? 'active' : ''}`}
            onClick={() => setActiveTab('medicines')}
            data-testid="tab-medicines"
          >
            <Package size={20} />
            Medicines
            <span className="badge">{medicines.length}</span>
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
            data-testid="tab-orders"
          >
            <ShoppingBag size={20} />
            Orders
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="badge">{orders.filter(o => o.status === 'pending').length}</span>
            )}
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            data-testid="tab-profile"
          >
            <Store size={20} />
            Pharmacy Profile
          </button>
        </div>

        <div className="dashboard-main">
          {/* Medicines Tab */}
          {activeTab === 'medicines' && (
            <div className="tab-content">
              <div className="page-header">
                <h1 className="page-title">Medicines Inventory</h1>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAddMedicine(true)}
                  data-testid="add-medicine-btn"
                >
                  <Plus size={20} />
                  Add Medicine
                </button>
              </div>

              {showAddMedicine && (
                <div className="modal-overlay" onClick={() => setShowAddMedicine(false)}>
                  <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <h2>Add New Medicine</h2>
                    <form onSubmit={handleAddMedicine} className="medicine-form">
                      <div className="form-group">
                        <label className="input-label">Medicine Name</label>
                        <input
                          type="text"
                          className="input-field"
                          value={medicineForm.name}
                          onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })}
                          required
                          data-testid="medicine-name-input"
                        />
                      </div>

                      <div className="form-group">
                        <label className="input-label">Description</label>
                        <textarea
                          className="input-field"
                          value={medicineForm.description}
                          onChange={(e) => setMedicineForm({ ...medicineForm, description: e.target.value })}
                          rows="3"
                        />
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="input-label">Price (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            className="input-field"
                            value={medicineForm.price}
                            onChange={(e) => setMedicineForm({ ...medicineForm, price: e.target.value })}
                            required
                            data-testid="medicine-price-input"
                          />
                        </div>
                        <div className="form-group">
                          <label className="input-label">Stock Quantity</label>
                          <input
                            type="number"
                            className="input-field"
                            value={medicineForm.stock_quantity}
                            onChange={(e) => setMedicineForm({ ...medicineForm, stock_quantity: e.target.value })}
                            required
                            data-testid="medicine-stock-input"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="input-label">Category</label>
                        <input
                          type="text"
                          className="input-field"
                          value={medicineForm.category}
                          onChange={(e) => setMedicineForm({ ...medicineForm, category: e.target.value })}
                          placeholder="e.g., Pain Relief, Antibiotics"
                        />
                      </div>

                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="prescription"
                          checked={medicineForm.requires_prescription}
                          onChange={(e) => setMedicineForm({ ...medicineForm, requires_prescription: e.target.checked })}
                        />
                        <label htmlFor="prescription">Requires Prescription</label>
                      </div>

                      <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddMedicine(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading} data-testid="submit-medicine-btn">
                          {loading ? 'Adding...' : 'Add Medicine'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className="medicines-grid">
                {medicines.length === 0 ? (
                  <p className="empty-message">No medicines added yet. Click "Add Medicine" to get started.</p>
                ) : (
                  medicines.map((medicine, index) => (
                    <div key={medicine.id} className="medicine-card" data-testid={`medicine-card-${index}`}>
                      <div className="medicine-header">
                        <h3>{medicine.name}</h3>
                        <div className="medicine-actions">
                          <button className="icon-btn" title="Delete" onClick={() => handleDeleteMedicine(medicine.id)}>
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      {medicine.description && <p className="medicine-desc">{medicine.description}</p>}
                      <div className="medicine-meta">
                        <div className="meta-tag">₹{medicine.price}</div>
                        <div className="meta-tag">Stock: {medicine.stock_quantity}</div>
                        {medicine.category && <div className="meta-tag">{medicine.category}</div>}
                      </div>
                      {medicine.requires_prescription && (
                        <div className="prescription-badge">Rx Required</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="tab-content">
              <h1 className="page-title">Orders</h1>

              {orders.length === 0 ? (
                <p className="empty-message">No orders yet.</p>
              ) : (
                <div className="orders-list">
                  {orders.map((order, index) => (
                    <div key={order.id} className="order-card" data-testid={`order-card-${index}`}>
                      <div className="order-header">
                        <div>
                          <h3>Order #{order.id.substring(0, 8)}</h3>
                          <p className="order-date">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="order-items">
                        <h4>Items:</h4>
                        {order.items.map((item, i) => (
                          <div key={i} className="order-item">
                            <span>{item.medicine_name} x {item.quantity}</span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="order-footer">
                        <div className="order-total">
                          <span>Total:</span>
                          <span>₹{order.total_amount}</span>
                        </div>
                        {order.status === 'pending' && (
                          <div className="order-actions">
                            <button 
                              className="btn btn-success btn-small"
                              onClick={() => handleOrderAction(order.id, 'accepted')}
                              data-testid={`accept-order-${index}`}
                            >
                              <CheckCircle size={16} />
                              Accept
                            </button>
                            <button 
                              className="btn btn-danger btn-small"
                              onClick={() => handleOrderAction(order.id, 'cancelled')}
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && pharmacy && (
            <div className="tab-content">
              <h1 className="page-title">Pharmacy Profile</h1>
              <div className="profile-card">
                <div className="profile-row">
                  <strong>Business Name:</strong>
                  <span>{pharmacy.business_name}</span>
                </div>
                <div className="profile-row">
                  <strong>Address:</strong>
                  <span>{pharmacy.location.address}</span>
                </div>
                <div className="profile-row">
                  <strong>Contact:</strong>
                  <span>{pharmacy.contact_phone}</span>
                </div>
                <div className="profile-row">
                  <strong>Operating Hours:</strong>
                  <span>{pharmacy.operating_hours}</span>
                </div>
                <div className="profile-row">
                  <strong>License Number:</strong>
                  <span>{pharmacy.license_number}</span>
                </div>
                <div className="profile-row">
                  <strong>Status:</strong>
                  <span className={pharmacy.is_active ? 'status-active' : 'status-inactive'}>
                    {pharmacy.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        /* Reusing dashboard styles from CustomerDashboard */
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

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
        }

        .medicines-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .medicine-card {
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .medicine-card:hover {
          border-color: #0ea5e9;
        }

        .medicine-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 12px;
        }

        .medicine-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .medicine-actions {
          display: flex;
          gap: 8px;
        }

        .icon-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #fee2e2;
          color: #991b1b;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .medicine-desc {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 12px;
        }

        .medicine-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .meta-tag {
          background: white;
          border: 1px solid #e5e7eb;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 13px;
          color: #64748b;
          font-weight: 600;
        }

        .prescription-badge {
          background: #fef3c7;
          color: #92400e;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          margin-top: 8px;
          display: inline-block;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 24px;
        }

        .medicine-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .checkbox-group input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 8px;
        }

        .orders-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .order-card {
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e5e7eb;
        }

        .order-header h3 {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .order-date {
          font-size: 14px;
          color: #64748b;
          margin-top: 4px;
        }

        .order-items {
          margin-bottom: 16px;
        }

        .order-items h4 {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 8px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          color: #64748b;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .order-total {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .order-total span:last-child {
          color: #0ea5e9;
        }

        .order-actions {
          display: flex;
          gap: 8px;
        }

        .btn-small {
          padding: 8px 16px;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .profile-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 32px;
          max-width: 700px;
        }

        .profile-row {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .profile-row:last-child {
          border-bottom: none;
        }

        .profile-row strong {
          color: #1e293b;
        }

        .profile-row span {
          color: #64748b;
        }

        .status-active {
          color: #059669 !important;
          font-weight: 600;
        }

        .status-inactive {
          color: #dc2626 !important;
          font-weight: 600;
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

          .medicines-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default PharmacyDashboard;
