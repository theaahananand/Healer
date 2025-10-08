import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, Clock, MapPin, ShoppingBag, Shield, ArrowRight } from 'lucide-react';

const CustomerLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="customer-landing">
      <nav className="navbar">
        <div className="nav-container">
          <div className="logo">
            <Pill size={32} />
            <span>Healer</span>
          </div>
          <button className="btn-signin" onClick={() => navigate('/customer/auth')} data-testid="signin-btn">
            Sign In
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1 data-testid="hero-title">
            Medicines Delivered in <span className="highlight">Minutes</span>
          </h1>
          <p className="subtitle">
            Order from nearby pharmacies. Compare prices. Track in real-time.
          </p>
          <button className="btn-primary" onClick={() => navigate('/customer/auth')} data-testid="get-started-btn">
            Get Started
            <ArrowRight size={20} />
          </button>

          <div className="stats">
            <div className="stat">
              <div className="stat-value">8-15</div>
              <div className="stat-label">Min Delivery</div>
            </div>
            <div className="stat">
              <div className="stat-value">100+</div>
              <div className="stat-label">Pharmacies</div>
            </div>
            <div className="stat">
              <div className="stat-value">24/7</div>
              <div className="stat-label">Available</div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="features-grid">
          <div className="feature">
            <Clock size={40} />
            <h3>Lightning Fast</h3>
            <p>Get medicines in 8-15 minutes</p>
          </div>
          <div className="feature">
            <MapPin size={40} />
            <h3>Real-Time Tracking</h3>
            <p>Track your order live on map</p>
          </div>
          <div className="feature">
            <ShoppingBag size={40} />
            <h3>Compare Prices</h3>
            <p>Find the best deals nearby</p>
          </div>
          <div className="feature">
            <Shield size={40} />
            <h3>Verified Pharmacies</h3>
            <p>Licensed & authentic medicines</p>
          </div>
        </div>
      </section>

      <style jsx>{`
        .customer-landing {
          min-height: 100vh;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        }

        .navbar {
          padding: 20px 0;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 28px;
          font-weight: 800;
          color: white;
        }

        .btn-signin {
          padding: 10px 24px;
          background: white;
          color: #0ea5e9;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .btn-signin:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .hero {
          padding: 100px 24px;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .hero h1 {
          font-size: 64px;
          font-weight: 800;
          color: white;
          margin-bottom: 24px;
          line-height: 1.1;
        }

        .highlight {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          font-size: 22px;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 40px;
        }

        .btn-primary {
          padding: 16px 40px;
          background: white;
          color: #0ea5e9;
          border: none;
          border-radius: 12px;
          font-size: 18px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }

        .stats {
          display: flex;
          justify-content: center;
          gap: 60px;
          margin-top: 60px;
          padding: 32px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border-radius: 16px;
        }

        .stat {
          text-align: center;
        }

        .stat-value {
          font-size: 40px;
          font-weight: 800;
          color: white;
        }

        .stat-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          margin-top: 4px;
        }

        .features {
          padding: 80px 24px;
          background: white;
        }

        .features-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 32px;
        }

        .feature {
          text-align: center;
          padding: 32px;
        }

        .feature svg {
          color: #0ea5e9;
          margin-bottom: 16px;
        }

        .feature h3 {
          font-size: 22px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .feature p {
          color: #64748b;
          line-height: 1.6;
        }

        @media (max-width: 768px) {
          .hero h1 {
            font-size: 40px;
          }

          .stats {
            flex-direction: column;
            gap: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default CustomerLanding;