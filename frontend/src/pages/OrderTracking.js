import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../App';
import { MapPin, Package, Clock, Phone, MessageCircle, ArrowLeft } from 'lucide-react';

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { API, token } = useContext(AuthContext);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(response.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = () => [
    { key: 'pending', label: 'Order Placed', completed: true },
    { key: 'accepted', label: 'Pharmacy Accepted', completed: order && ['accepted', 'preparing', 'picked_up', 'in_transit', 'delivered'].includes(order.status) },
    { key: 'preparing', label: 'Preparing', completed: order && ['preparing', 'picked_up', 'in_transit', 'delivered'].includes(order.status) },
    { key: 'picked_up', label: 'Picked Up', completed: order && ['picked_up', 'in_transit', 'delivered'].includes(order.status) },
    { key: 'in_transit', label: 'On the Way', completed: order && ['in_transit', 'delivered'].includes(order.status) },
    { key: 'delivered', label: 'Delivered', completed: order && order.status === 'delivered' }
  ];

  if (loading) {
    return (
      <div className="tracking-page">
        <div className="loading">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="tracking-page">
        <div className="error">Order not found</div>
      </div>
    );
  }

  return (
    <div className="tracking-page">
      <div className="tracking-container">
        <button className="back-btn" onClick={() => navigate(-1)} data-testid="back-btn">
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="tracking-header">
          <h1>Track Your Order</h1>
          <p>Order #{order.id.substring(0, 8)}</p>
        </div>

        {/* Status Timeline */}
        <div className="status-timeline">
          {getStatusSteps().map((step, index) => (
            <div key={step.key} className={`timeline-step ${step.completed ? 'completed' : ''}`}>
              <div className="step-indicator">
                {step.completed && <div className="step-checkmark">✓</div>}
              </div>
              <div className="step-label">{step.label}</div>
              {index < getStatusSteps().length - 1 && <div className="step-connector"></div>}
            </div>
          ))}
        </div>

        {/* Order Details */}
        <div className="order-details-card">
          <h2>Order Details</h2>
          <div className="details-grid">
            <div className="detail-item">
              <Package size={20} />
              <div>
                <p className="detail-label">Items</p>
                <p className="detail-value">{order.items.length} item(s)</p>
              </div>
            </div>
            <div className="detail-item">
              <MapPin size={20} />
              <div>
                <p className="detail-label">Delivery Address</p>
                <p className="detail-value">{order.delivery_address.address || 'Current Location'}</p>
              </div>
            </div>
            <div className="detail-item">
              <Clock size={20} />
              <div>
                <p className="detail-label">Estimated Time</p>
                <p className="detail-value">{order.estimated_time} minutes</p>
              </div>
            </div>
          </div>

          <div className="order-items-list">
            <h3>Items in this order:</h3>
            {order.items.map((item, index) => (
              <div key={index} className="order-item">
                <span>{item.medicine_name} x {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="order-total">
            <span>Total Amount:</span>
            <span>₹{order.total_amount}</span>
          </div>
        </div>

        {/* Map Placeholder */}
        <div className="map-placeholder">
          <MapPin size={48} />
          <p>Live tracking map (integration pending)</p>
          <p className="map-note">Distance: {order.distance_km} km</p>
        </div>

        {/* Contact Actions */}
        {order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="contact-actions">
            <button className="contact-btn">
              <Phone size={20} />
              Call Driver
            </button>
            <button className="contact-btn">
              <MessageCircle size={20} />
              Chat with Driver
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .tracking-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #e8f4f8 100%);
          padding: 24px;
        }

        .tracking-container {
          max-width: 800px;
          margin: 0 auto;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          border-color: #0ea5e9;
          color: #0ea5e9;
        }

        .tracking-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .tracking-header h1 {
          font-size: 36px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .tracking-header p {
          font-size: 16px;
          color: #64748b;
        }

        .status-timeline {
          background: white;
          border-radius: 16px;
          padding: 40px 32px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          position: relative;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 1;
        }

        .step-indicator {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          position: relative;
          z-index: 2;
        }

        .timeline-step.completed .step-indicator {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        }

        .step-checkmark {
          color: white;
          font-size: 24px;
          font-weight: bold;
        }

        .step-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          text-align: center;
          max-width: 100px;
        }

        .timeline-step.completed .step-label {
          color: #0ea5e9;
        }

        .step-connector {
          position: absolute;
          top: 24px;
          left: 50%;
          width: 100%;
          height: 4px;
          background: #e5e7eb;
          z-index: 1;
        }

        .timeline-step.completed .step-connector {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        }

        .order-details-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
        }

        .order-details-card h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 24px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .detail-item {
          display: flex;
          gap: 12px;
          align-items: start;
          color: #0ea5e9;
        }

        .detail-label {
          font-size: 12px;
          color: #94a3b8;
          margin-bottom: 4px;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
        }

        .order-items-list {
          padding: 24px 0;
          border-top: 1px solid #e5e7eb;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .order-items-list h3 {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 16px;
        }

        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          color: #64748b;
        }

        .order-total {
          display: flex;
          justify-content: space-between;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .order-total span:last-child {
          color: #0ea5e9;
        }

        .map-placeholder {
          background: white;
          border-radius: 16px;
          padding: 80px 32px;
          text-align: center;
          margin-bottom: 24px;
          color: #64748b;
        }

        .map-placeholder svg {
          color: #0ea5e9;
          margin-bottom: 16px;
        }

        .map-note {
          margin-top: 8px;
          font-weight: 600;
        }

        .contact-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .contact-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 24px;
          background: white;
          border: 2px solid #0ea5e9;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          color: #0ea5e9;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .contact-btn:hover {
          background: #0ea5e9;
          color: white;
        }

        .loading,
        .error {
          text-align: center;
          padding: 100px 20px;
          font-size: 18px;
          color: #64748b;
        }

        @media (max-width: 768px) {
          .status-timeline {
            flex-direction: column;
            gap: 24px;
          }

          .step-connector {
            display: none;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .contact-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default OrderTracking;
