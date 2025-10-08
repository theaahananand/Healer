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
    <div className=\"dashboard\">
      <nav className=\"nav\">\n        <div className=\"nav-content\">\n          <h2>Healer</h2>\n          <button onClick={logout} data-testid=\"logout-btn\">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </nav>

      <div className=\"container\">\n        <div className=\"sidebar\">\n          <button className={activeTab === 'search' ? 'active' : ''} onClick={() => setActiveTab('search')} data-testid=\"tab-search\">\n            <Search size={20} /> Search\n          </button>\n          <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')} data-testid=\"tab-orders\">\n            <Package size={20} /> Orders {myOrders.length > 0 && <span className=\"badge\">{myOrders.length}</span>}\n          </button>\n          <button className={activeTab === 'cart' ? 'active' : ''} onClick={() => setActiveTab('cart')} data-testid=\"tab-cart\">\n            <ShoppingCart size={20} /> Cart {cart.length > 0 && <span className=\"badge\">{cart.length}</span>}\n          </button>\n          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>\n            <User size={20} /> Profile\n          </button>\n        </div>

        <div className=\"main\">\n          {activeTab === 'search' && (\n            <div>\n              <h1>Search Medicines</h1>\n              <div className=\"search-bar\">\n                <input\n                  type=\"text\"\n                  placeholder=\"Search for medicines...\"\n                  value={searchQuery}\n                  onChange={(e) => setSearchQuery(e.target.value)}\n                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}\n                  data-testid=\"search-input\"\n                />\n                <button onClick={handleSearch} disabled={loading} data-testid=\"search-btn\">\n                  {loading ? 'Searching...' : 'Search'}\n                </button>\n              </div>\n\n              <div className=\"results\">\n                {searchResults.map((result, i) => (\n                  <div key={i} className=\"card\" data-testid={`medicine-card-${i}`}>\n                    <h3>{result.medicine.name}</h3>\n                    <p className=\"pharmacy\">{result.pharmacy.business_name}</p>\n                    <div className=\"meta\">\n                      <span><MapPin size={16} /> {result.distance_km} km</span>\n                      <span><Clock size={16} /> {result.estimated_time} min</span>\n                    </div>\n                    <div className=\"footer\">\n                      <div className=\"price\"><IndianRupee size={18} />{result.medicine.price}</div>\n                      <button onClick={() => addToCart(result)} data-testid={`add-cart-${i}`}>Add to Cart</button>\n                    </div>\n                  </div>\n                ))}\n              </div>\n            </div>\n          )}\n\n          {activeTab === 'cart' && (\n            <div>\n              <h1>Shopping Cart</h1>\n              {cart.length === 0 ? (\n                <p className=\"empty\">Cart is empty</p>\n              ) : (\n                <div className=\"cart-grid\">\n                  <div className=\"cart-items\">\n                    {cart.map((item, i) => (\n                      <div key={i} className=\"cart-item\">\n                        <div>\n                          <h3>{item.medicine.name}</h3>\n                          <p>{item.pharmacy.business_name}</p>\n                        </div>\n                        <div className=\"quantity\">\n                          <button onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}>-</button>\n                          <span>{item.quantity}</span>\n                          <button onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}>+</button>\n                        </div>\n                        <div className=\"price\"><IndianRupee size={16} />{(item.medicine.price * item.quantity).toFixed(2)}</div>\n                      </div>\n                    ))}\n                  </div>\n                  <div className=\"summary\">\n                    <h3>Summary</h3>\n                    <div className=\"total\">\n                      <span>Total:</span>\n                      <span><IndianRupee size={18} />{cart.reduce((sum, item) => sum + (item.medicine.price * item.quantity), 0).toFixed(2)}</span>\n                    </div>\n                    <button className=\"checkout\" onClick={handleCheckout} data-testid=\"checkout-btn\">Place Order</button>\n                  </div>\n                </div>\n              )}\n            </div>\n          )}\n\n          {activeTab === 'orders' && (\n            <div>\n              <h1>My Orders</h1>\n              {myOrders.length === 0 ? (\n                <p className=\"empty\">No orders yet</p>\n              ) : (\n                <div className=\"orders\">\n                  {myOrders.map((order, i) => (\n                    <div key={order.id} className=\"order-card\">\n                      <div className=\"order-header\">\n                        <div>\n                          <h3>Order #{order.id.substring(0, 8)}</h3>\n                          <p>{new Date(order.created_at).toLocaleDateString()}</p>\n                        </div>\n                        <span className={`status status-${order.status}`}>{order.status}</span>\n                      </div>\n                      <div className=\"items\">\n                        {order.items.map((item, j) => (\n                          <div key={j}>\n                            <span>{item.medicine_name} x {item.quantity}</span>\n                            <span><IndianRupee size={14} />{item.price * item.quantity}</span>\n                          </div>\n                        ))}\n                      </div>\n                      <div className=\"order-footer\">\n                        <span><strong>Total: <IndianRupee size={16} />{order.total_amount}</strong></span>\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              )}\n            </div>\n          )}\n\n          {activeTab === 'profile' && (\n            <div>\n              <h1>My Profile</h1>\n              <div className=\"profile\">\n                <div className=\"avatar\"><User size={48} /></div>\n                <p><strong>Name:</strong> {user.name}</p>\n                <p><strong>Email:</strong> {user.email}</p>\n                <p><strong>Phone:</strong> {user.phone || 'Not provided'}</p>\n              </div>\n            </div>\n          )}\n        </div>\n      </div>\n\n      <style jsx>{`\n        .dashboard { min-height: 100vh; background: #f8fafc; }\n        .nav { background: white; border-bottom: 1px solid #e5e7eb; padding: 16px 0; }\n        .nav-content { max-width: 1400px; margin: 0 auto; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; }\n        .nav h2 { color: #0ea5e9; font-size: 24px; font-weight: 700; }\n        .nav button { display: flex; align-items: center; gap: 8px; padding: 10px 20px; background: #fee2e2; color: #991b1b; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }\n        .container { max-width: 1400px; margin: 0 auto; padding: 24px; display: grid; grid-template-columns: 250px 1fr; gap: 24px; }\n        .sidebar { display: flex; flex-direction: column; gap: 8px; }\n        .sidebar button { display: flex; align-items: center; gap: 12px; padding: 14px 20px; background: white; border: 2px solid transparent; border-radius: 12px; font-weight: 600; color: #64748b; cursor: pointer; text-align: left; transition: all 0.3s; }\n        .sidebar button:hover { background: #f1f5f9; color: #0ea5e9; }\n        .sidebar button.active { background: #0ea5e9; color: white; }\n        .badge { margin-left: auto; background: #ef4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 12px; }\n        .sidebar button.active .badge { background: white; color: #0ea5e9; }\n        .main { background: white; border-radius: 16px; padding: 32px; }\n        .main h1 { font-size: 32px; font-weight: 800; color: #1e293b; margin-bottom: 24px; }\n        .search-bar { display: flex; gap: 12px; margin-bottom: 32px; }\n        .search-bar input { flex: 1; padding: 14px 20px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; }\n        .search-bar input:focus { outline: none; border-color: #0ea5e9; }\n        .search-bar button { padding: 14px 32px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }\n        .results { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }\n        .card { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 16px; padding: 20px; transition: all 0.3s; }\n        .card:hover { border-color: #0ea5e9; }\n        .card h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }\n        .pharmacy { font-size: 14px; color: #64748b; margin-bottom: 12px; }\n        .meta { display: flex; gap: 16px; margin-bottom: 16px; font-size: 14px; color: #64748b; }\n        .meta span { display: flex; align-items: center; gap: 6px; }\n        .footer { display: flex; justify-content: space-between; align-items: center; }\n        .price { display: flex; align-items: center; gap: 4px; font-size: 20px; font-weight: 700; color: #0ea5e9; }\n        .footer button { padding: 8px 20px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }\n        .cart-grid { display: grid; grid-template-columns: 1fr 350px; gap: 24px; }\n        .cart-items { display: flex; flex-direction: column; gap: 16px; }\n        .cart-item { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; }\n        .cart-item h3 { font-size: 18px; font-weight: 600; color: #1e293b; }\n        .cart-item p { font-size: 14px; color: #64748b; }\n        .quantity { display: flex; align-items: center; gap: 12px; background: white; border: 2px solid #e5e7eb; border-radius: 8px; padding: 4px 8px; }\n        .quantity button { width: 28px; height: 28px; border: none; background: #0ea5e9; color: white; border-radius: 6px; cursor: pointer; font-weight: 600; }\n        .quantity span { min-width: 30px; text-align: center; font-weight: 600; }\n        .summary { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; height: fit-content; position: sticky; top: 100px; }\n        .summary h3 { font-size: 20px; font-weight: 700; margin-bottom: 20px; }\n        .total { display: flex; justify-content: space-between; padding: 12px 0; font-size: 20px; font-weight: 700; }\n        .total span { display: flex; align-items: center; gap: 4px; }\n        .checkout { width: 100%; padding: 14px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; margin-top: 16px; }\n        .orders { display: flex; flex-direction: column; gap: 16px; }\n        .order-card { background: #f8fafc; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; }\n        .order-header { display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }\n        .order-header h3 { font-size: 18px; font-weight: 700; }\n        .order-header p { font-size: 14px; color: #64748b; }\n        .status { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; text-transform: capitalize; }\n        .status-pending { background: #fef3c7; color: #92400e; }\n        .status-accepted { background: #dbeafe; color: #1e40af; }\n        .status-delivered { background: #d1fae5; color: #065f46; }\n        .items { margin-bottom: 16px; }\n        .items > div { display: flex; justify-content: space-between; padding: 8px 0; color: #64748b; }\n        .items span { display: flex; align-items: center; gap: 4px; }\n        .order-footer { padding-top: 16px; border-top: 1px solid #e5e7eb; }\n        .profile { background: #f8fafc; border-radius: 12px; padding: 32px; max-width: 600px; }\n        .avatar { width: 100px; height: 100px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin: 0 auto 24px; }\n        .profile p { padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #64748b; }\n        .empty { text-align: center; padding: 48px; color: #64748b; }\n        @media (max-width: 1024px) {\n          .container { grid-template-columns: 1fr; }\n          .sidebar { flex-direction: row; overflow-x: auto; }\n          .cart-grid { grid-template-columns: 1fr; }\n        }\n      `}</style>\n    </div>\n  );\n};\n\nexport default CustomerDashboard;
