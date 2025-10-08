import React, { useState, useEffect, useContext } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CustomerContext } from '../CustomerApp';
import { Search, Package, User, LogOut, ShoppingCart, MapPin, Clock, IndianRupee } from 'lucide-react';

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, API, token } = useContext(CustomerContext);
  const [activeTab, setActiveTab] = useState('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090 }); // Default: Delhi
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyOrders();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error('Location error:', error)
      );
    }
  };

  const fetchMyOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API}/medicines/search`, {
        params: { q: searchQuery, lat: userLocation.lat, lng: userLocation.lng }
      });
      setSearchResults(response.data);
      setActiveTab('search');
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (result) => {
    const existingItem = cart.find(item => item.medicine.id === result.medicine.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.medicine.id === result.medicine.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...result, quantity: 1 }]);
    }
  };

  const removeFromCart = (medicineId) => {
    setCart(cart.filter(item => item.medicine.id !== medicineId));
  };

  const updateQuantity = (medicineId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(medicineId);
    } else {
      setCart(cart.map(item => 
        item.medicine.id === medicineId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.medicine.price * item.quantity), 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Group cart items by pharmacy
    const itemsByPharmacy = {};
    cart.forEach(item => {
      if (!itemsByPharmacy[item.pharmacy.id]) {
        itemsByPharmacy[item.pharmacy.id] = [];
      }
      itemsByPharmacy[item.pharmacy.id].push(item);
    });

    // Create orders for each pharmacy
    try {
      for (const [pharmacyId, items] of Object.entries(itemsByPharmacy)) {
        const orderItems = items.map(item => ({
          medicine_id: item.medicine.id,
          medicine_name: item.medicine.name,
          quantity: item.quantity,
          price: item.medicine.price
        }));

        await axios.post(`${API}/orders`, {
          pharmacy_id: pharmacyId,
          items: orderItems,
          delivery_address: {
            lat: userLocation.lat,
            lng: userLocation.lng,
            address: 'Current Location' // In real app, get actual address
          },
          payment_method: 'cash_on_delivery',
          notes: ''
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      alert('Orders placed successfully!');
      setCart([]);
      fetchMyOrders();
      setActiveTab('orders');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to place order');
    }
  };

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-content">
          <div className="nav-brand">
            <h2>Healer</h2>
            <span className="user-badge">Customer</span>
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
            className={`sidebar-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
            data-testid="tab-search"
          >
            <Search size={20} />
            Search Medicines
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
            data-testid="tab-orders"
          >
            <Package size={20} />
            My Orders
            {myOrders.length > 0 && <span className="badge">{myOrders.length}</span>}
          </button>
          <button 
            className={`sidebar-btn ${activeTab === 'cart' ? 'active' : ''}`}
            onClick={() => setActiveTab('cart')}
            data-testid="tab-cart"
          >
            <ShoppingCart size={20} />
            Cart
            {cart.length > 0 && <span className="badge">{cart.length}</span>}
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
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="tab-content">
              <h1 className="page-title">Search Medicines</h1>
              
              <div className="search-bar">
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search for medicines (e.g., Paracetamol, Aspirin)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid="search-input"
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleSearch}
                  disabled={loading}
                  data-testid="search-btn"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className="search-results">
                {searchResults.length === 0 && searchQuery && !loading && (
                  <p className="empty-message">No medicines found. Try a different search.</p>
                )}
                
                {searchResults.map((result, index) => (
                  <div key={index} className="medicine-card" data-testid={`medicine-card-${index}`}>
                    <div className="medicine-header">
                      <div>
                        <h3 className="medicine-name">{result.medicine.name}</h3>
                        <p className="pharmacy-name">{result.pharmacy.business_name}</p>
                      </div>
                      <div className="medicine-price">
                        <IndianRupee size={18} />
                        {result.medicine.price}
                      </div>
                    </div>
                    
                    <div className="medicine-meta">
                      <div className="meta-item">
                        <MapPin size={16} />
                        {result.distance_km} km away
                      </div>
                      <div className="meta-item">
                        <Clock size={16} />
                        {result.estimated_time} mins
                      </div>
                    </div>
                    
                    <button 
                      className="btn btn-primary btn-small"
                      onClick={() => addToCart(result)}
                      data-testid={`add-to-cart-${index}`}
                    >
                      Add to Cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cart Tab */}
          {activeTab === 'cart' && (
            <div className="tab-content">
              <h1 className="page-title">Shopping Cart</h1>
              
              {cart.length === 0 ? (
                <p className="empty-message">Your cart is empty. Search for medicines to add.</p>
              ) : (
                <div className="cart-container">
                  <div className="cart-items">
                    {cart.map((item, index) => (
                      <div key={index} className="cart-item" data-testid={`cart-item-${index}`}>
                        <div className="cart-item-info">
                          <h3>{item.medicine.name}</h3>
                          <p className="pharmacy-name">{item.pharmacy.business_name}</p>
                        </div>
                        <div className="cart-item-actions">
                          <div className="quantity-control">
                            <button onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}>+</button>
                          </div>
                          <div className="cart-item-price">
                            <IndianRupee size={16} />
                            {(item.medicine.price * item.quantity).toFixed(2)}
                          </div>
                          <button 
                            className="btn-remove"
                            onClick={() => removeFromCart(item.medicine.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="cart-summary">
                    <h3>Order Summary</h3>
                    <div className="summary-row">
                      <span>Total Items:</span>
                      <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Total Amount:</span>
                      <span>
                        <IndianRupee size={18} />
                        {getTotalAmount().toFixed(2)}
                      </span>
                    </div>
                    <button 
                      className="btn btn-primary btn-full"
                      onClick={handleCheckout}
                      data-testid="checkout-btn"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="tab-content">
              <h1 className="page-title">My Orders</h1>
              
              {myOrders.length === 0 ? (
                <p className="empty-message">No orders yet. Start shopping!</p>
              ) : (
                <div className="orders-list">
                  {myOrders.map((order, index) => (
                    <div key={order.id} className="order-card" data-testid={`order-card-${index}`}>
                      <div className="order-header">
                        <div>
                          <h3>Order #{order.id.substring(0, 8)}</h3>
                          <p className="order-date">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`status-badge status-${order.status}`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="order-items">
                        {order.items.map((item, i) => (
                          <div key={i} className="order-item">
                            <span>{item.medicine_name} x {item.quantity}</span>
                            <span><IndianRupee size={14} />{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="order-footer">
                        <div className="order-total">
                          <span>Total:</span>
                          <span><IndianRupee size={16} />{order.total_amount}</span>
                        </div>
                        <button 
                          className="btn btn-secondary btn-small"
                          onClick={() => navigate(`/track/${order.id}`)}
                        >
                          Track Order
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="tab-content">
              <h1 className="page-title">My Profile</h1>
              <div className="profile-card">
                <div className="profile-avatar">
                  <User size={48} />
                </div>
                <div className="profile-info">
                  <p><strong>Name:</strong> {user.name}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
                  <p><strong>Role:</strong> Customer</p>
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
          transition: all 0.3s ease;
        }

        .btn-logout:hover {
          background: #fecaca;
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
          border-color: #0ea5e9;
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
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .page-title {
          font-size: 32px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 24px;
        }

        .search-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
        }

        .search-input {
          flex: 1;
          padding: 14px 20px;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 16px;
        }

        .search-input:focus {
          outline: none;
          border-color: #0ea5e9;
        }

        .search-results {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }

        .medicine-card {
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
        }

        .medicine-card:hover {
          border-color: #0ea5e9;
          box-shadow: 0 4px 16px rgba(14, 165, 233, 0.1);
        }

        .medicine-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 16px;
        }

        .medicine-name {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .pharmacy-name {
          font-size: 14px;
          color: #64748b;
        }

        .medicine-price {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 20px;
          font-weight: 700;
          color: #0ea5e9;
        }

        .medicine-meta {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: #64748b;
        }

        .cart-container {
          display: grid;
          grid-template-columns: 1fr 350px;
          gap: 24px;
        }

        .cart-items {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .cart-item {
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cart-item-info h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 4px;
        }

        .cart-item-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .quantity-control {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 4px 8px;
        }

        .quantity-control button {
          width: 28px;
          height: 28px;
          border: none;
          background: #0ea5e9;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .quantity-control span {
          min-width: 30px;
          text-align: center;
          font-weight: 600;
        }

        .cart-item-price {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 18px;
          font-weight: 700;
          color: #0ea5e9;
        }

        .btn-remove {
          padding: 8px 16px;
          background: #fee2e2;
          color: #991b1b;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .btn-remove:hover {
          background: #fecaca;
        }

        .cart-summary {
          background: #f8fafc;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          padding: 24px;
          height: fit-content;
          position: sticky;
          top: 100px;
        }

        .cart-summary h3 {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 20px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
          color: #64748b;
        }

        .summary-row.total {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          border-bottom: none;
          margin-top: 12px;
        }

        .summary-row.total span {
          display: flex;
          align-items: center;
          gap: 4px;
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
          margin-bottom: 4px;
        }

        .order-date {
          font-size: 14px;
          color: #64748b;
        }

        .order-items {
          margin-bottom: 16px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          color: #64748b;
        }

        .order-item span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .order-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .order-total {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .order-total span:last-child {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #0ea5e9;
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
          font-size: 16px;
        }

        .btn-small {
          padding: 8px 20px;
          font-size: 14px;
        }

        .btn-full {
          width: 100%;
          margin-top: 16px;
        }

        @media (max-width: 1024px) {
          .dashboard-container {
            grid-template-columns: 1fr;
          }

          .dashboard-sidebar {
            flex-direction: row;
            overflow-x: auto;
          }

          .cart-container {
            grid-template-columns: 1fr;
          }

          .cart-summary {
            position: static;
          }
        }

        @media (max-width: 640px) {
          .search-results {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboard;
