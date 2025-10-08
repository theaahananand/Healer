import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090 });
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

  const updateQuantity = (medicineId, newQuantity) => {
    if (newQuantity < 1) {
      setCart(cart.filter(item => item.medicine.id !== medicineId));
    } else {
      setCart(cart.map(item => 
        item.medicine.id === medicineId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const itemsByPharmacy = {};
    cart.forEach(item => {
      if (!itemsByPharmacy[item.pharmacy.id]) {
        itemsByPharmacy[item.pharmacy.id] = [];
      }
      itemsByPharmacy[item.pharmacy.id].push(item);
    });

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
            address: 'Current Location'
          },
          payment_method: 'cash_on_delivery'
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
      <nav className="nav">
        <div className="nav-content">
          <h2>Healer</h2>
          <button onClick={logout} data-testid="logout-btn">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </nav>

      <div className="container">
        <div className="sidebar">
          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')} data-testid="tab-search">
            <Search size={20} /> Search
          </button>
          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')} data-testid="tab-orders">
            <Package size={20} /> Orders {myOrders.length > 0 && <span className="badge">{myOrders.length}</span>}
          </button>
          <button className={activeTab === 'cart' ? 'active' : ''} onClick={() => setActiveTab('cart')} data-testid="tab-cart">
            <ShoppingCart size={20} /> Cart {cart.length > 0 && <span className="badge">{cart.length}</span>}
          </button>
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
            <User size={20} /> Profile
          </button>
        </div>

        <div className="main">
          {activeTab === 'search' && (
            <div>
              <h1>Search Medicines</h1>
              <div className=\"search-bar\">
                <input
                  type=\"text\"
                  placeholder=\"Search for medicines...\"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  data-testid=\"search-input\"
                />
                <button onClick={handleSearch} disabled={loading} data-testid=\"search-btn\">
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </div>

              <div className=\"results\">
                {searchResults.map((result, i) => (
                  <div key={i} className=\"card\" data-testid={`medicine-card-${i}`}>
                    <h3>{result.medicine.name}</h3>
                    <p className=\"pharmacy\">{result.pharmacy.business_name}</p>
                    <div className=\"meta\">
                      <span><MapPin size={16} /> {result.distance_km} km</span>
                      <span><Clock size={16} /> {result.estimated_time} min</span>
                    </div>
                    <div className=\"footer\">
                      <div className=\"price\"><IndianRupee size={18} />{result.medicine.price}</div>
                      <button onClick={() => addToCart(result)} data-testid={`add-cart-${i}`}>Add to Cart</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'cart' && (
            <div>
              <h1>Shopping Cart</h1>
              {cart.length === 0 ? (
                <p className=\"empty\">Cart is empty</p>
              ) : (
                <div className=\"cart-grid\">
                  <div className=\"cart-items\">
                    {cart.map((item, i) => (
                      <div key={i} className=\"cart-item\">
                        <div>
                          <h3>{item.medicine.name}</h3>
                          <p>{item.pharmacy.business_name}</p>
                        </div>
                        <div className=\"quantity\">
                          <button onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}>+</button>
                        </div>
                        <div className=\"price\"><IndianRupee size={16} />{(item.medicine.price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                  <div className=\"summary\">
                    <h3>Summary</h3>
                    <div className=\"total\">
                      <span>Total:</span>
                      <span><IndianRupee size={18} />{cart.reduce((sum, item) => sum + (item.medicine.price * item.quantity), 0).toFixed(2)}</span>
                    </div>
                    <button className=\"checkout\" onClick={handleCheckout} data-testid=\"checkout-btn\">Place Order</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              <h1>My Orders</h1>
              {myOrders.length === 0 ? (
                <p className=\"empty\">No orders yet</p>
              ) : (
                <div className=\"orders\">
                  {myOrders.map((order, i) => (
                    <div key={order.id} className=\"order-card\">
                      <div className=\"order-header\">
                        <div>
                          <h3>Order #{order.id.substring(0, 8)}</h3>
                          <p>{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`status status-${order.status}`}>{order.status}</span>
                      </div>
                      <div className=\"items\">
                        {order.items.map((item, j) => (
                          <div key={j}>
                            <span>{item.medicine_name} x {item.quantity}</span>
                            <span><IndianRupee size={14} />{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className=\"order-footer\">
                        <span><strong>Total: <IndianRupee size={16} />{order.total_amount}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h1>My Profile</h1>
              <div className=\"profile\">
                <div className=\"avatar\"><User size={48} /></div>
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .dashboard { min-height: 100vh; background: #f8fafc; }
        .nav { background: white; border-bottom: 1px solid #e5e7eb; padding: 16px 0; }
        .nav-content { max-width: 1400px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; }
        .nav h2 { color: #0ea5e9; font-size: 24px; font-weight: 700; }
        .nav button { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #fee2e2; color: #991b1b; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .container { max-width: 1400px; margin: 0 auto; padding: 24px; display: grid; grid-template-columns: 250px 1fr; gap: 24px; }
        .sidebar { display: flex; flex-direction: column; gap: 8px; }
        .sidebar button { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: white; border: 2px solid transparent; border-radius: 12px; font-weight: 600; color: #64748b; cursor: pointer; text-align: left; transition: all 0.3s; }
        .sidebar button:hover { background: #f1f5f9; color: #0ea5e9; }
        .sidebar button.active { background: #0ea5e9; color: white; }
        .badge { margin-left: auto; background: #ef4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
        .sidebar button.active .badge { background: white; color: #0ea5e9; }
        .main { background: white; border-radius: 16px; padding: 32px; }
        .main h1 { font-size: 32px; font-weight: 800; color: #1e293b; margin-bottom: 24px; }
        .search-bar { display: flex; gap: 12px; margin-bottom: 32px; }
        .search-bar input { flex: 1; padding: 14px 20px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; }
        .search-bar input:focus { outline: none; border-color: #0ea5e9; }
        .search-bar button { padding: 14px 32px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
        .results { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
        .card { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 16px; padding: 20px; transition: all 0.3s; }
        .card:hover { border-color: #0ea5e9; }
        .card h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }
        .pharmacy { font-size: 14px; color: #64748b; margin-bottom: 12px; }
        .meta { display: flex; gap: 16px; margin-bottom: 16px; font-size: 14px; color: #64748b; }
        .meta span { display: flex; align-items: center; gap: 6px; }
        .footer { display: flex; justify-content: space-between; align-items: center; }
        .price { display: flex; align-items: center; gap: 4px; font-size: 20px; font-weight: 700; color: #0ea5e9; }
        .footer button { padding: 8px 20px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .cart-grid { display: grid; grid-template-columns: 1fr 350px; gap: 24px; }
        .cart-items { display: flex; flex-direction: column; gap: 16px; }
        .cart-item { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
        .cart-item h3 { font-size: 18px; font-weight: 600; color: #1e293b; }
        .cart-item p { font-size: 14px; color: #64748b; }
        .quantity { display: flex; align-items: center; gap: 12px; background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 4px 8px; }
        .quantity button { width: 28px; height: 28px; border: none; background: #0ea5e9; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; }
        .quantity span { min-width: 30px; text-align: center; font-weight: 600; }
        .summary { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; height: fit-content; position: sticky; top: 100px; }
        .summary h3 { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
        .total { display: flex; justify-content: space-between; padding: 12px 0; font-size: 20px; font-weight: 700; }
        .total span { display: flex; align-items: center; gap: 4px; }
        .checkout { width: 100%; padding: 14px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; margin-top: 16px; }
        .orders { display: flex; flex-direction: column; gap: 16px; }
        .order-card { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; }
        .order-header { display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
        .order-header h3 { font-size: 18px; font-weight: 700; }
        .order-header p { font-size: 14px; color: #64748b; }
        .status { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: capitalize; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-accepted { background: #dbeafe; color: #1e40af; }
        .status-delivered { background: #d1fae5; color: #065f46; }
        .items { margin-bottom: 16px; }
        .items > div { display: flex; justify-content: space-between; padding: 8px 0; color: #64748b; }
        .items span { display: flex; align-items: center; gap: 4px; }
        .order-footer { padding-top: 16px; border-top: 1px solid #e5e7eb; }
        .profile { background: #f8fafc; border-radius: 12px; padding: 32px; max-width: 600px; }
        .avatar { width: 100px; height: 100px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin: 0 auto 24px; }
        .profile p { padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #64748b; }
        .empty { text-align: center; padding: 48px; color: #64748b; }
        @media (max-width: 1024px) {
          .container { grid-template-columns: 1fr; }
          .sidebar { flex-direction: row; overflow-x: auto; }
          .cart-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboard;
