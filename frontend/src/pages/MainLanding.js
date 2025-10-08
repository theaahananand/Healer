import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Store, Truck, ArrowRight, Pill } from 'lucide-react';

const MainLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="main-landing">
      <nav className="main-nav">
        <div className="nav-container">
          <div className="logo">
            <Pill className="logo-icon" />
            <span className="logo-text">Healer</span>
          </div>
          <p className="tagline">Medicines in Minutes</p>
        </div>
      </nav>

      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title" data-testid="main-hero-title">
            Welcome to <span className="brand">Healer</span>
          </h1>
          <p className="hero-subtitle">
            Choose your platform to get started
          </p>

          <div className="app-cards">
            <div 
              className="app-card customer-card"
              onClick={() => navigate('/customer')}
              data-testid="customer-app-card"
            >
              <div className="card-icon">
                <ShoppingBag size={48} />
              </div>
              <h2>For Customers</h2>
              <p>Order medicines from nearby pharmacies and get them delivered in minutes</p>
              <button className="card-btn">
                Open Customer App
                <ArrowRight size={20} />
              </button>
            </div>

            <div 
              className="app-card pharmacy-card"
              onClick={() => navigate('/pharmacy')}
              data-testid="pharmacy-app-card"
            >
              <div className="card-icon">
                <Store size={48} />
              </div>
              <h2>For Pharmacies</h2>
              <p>Manage your inventory, accept orders, and grow your business online</p>
              <button className="card-btn">
                Open Pharmacy Dashboard
                <ArrowRight size={20} />
              </button>
            </div>

            <div 
              className="app-card driver-card"
              onClick={() => navigate('/driver')}
              data-testid="driver-app-card"
            >
              <div className="card-icon">
                <Truck size={48} />
              </div>
              <h2>For Drivers</h2>
              <p>Earn by delivering medicines. Flexible hours, competitive pay</p>
              <button className="card-btn">
                Open Driver App
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="main-footer">
        <p>© 2025 Healer. Making healthcare accessible, one delivery at a time.</p>
      </footer>

      <style jsx>{`
        .main-landing {
          min-height: 100vh;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #0891b2 100%);
          position: relative;
          overflow: hidden;
        }

        .main-landing::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        .main-nav {
          padding: 24px 0;
          position: relative;
          z-index: 10;
        }

        .nav-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .logo-icon {
          width: 40px;
          height: 40px;
          color: white;
        }

        .logo-text {
          font-size: 32px;
          font-weight: 800;
          color: white;
        }

        .tagline {
          color: rgba(255, 255, 255, 0.95);
          font-size: 16px;
          font-weight: 500;
        }

        .hero-section {
          min-height: calc(100vh - 120px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          position: relative;
          z-index: 1;
        }

        .hero-content {
          max-width: 1200px;
          width: 100%;
          text-align: center;
        }

        .hero-title {
          font-size: 64px;
          font-weight: 800;
          color: white;
          margin-bottom: 16px;
          line-height: 1.1;
        }

        .brand {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 24px;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 64px;
          font-weight: 500;
        }

        .app-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          max-width: 1100px;
          margin: 0 auto;
        }

        .app-card {
          background: white;
          border-radius: 24px;
          padding: 40px 32px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .app-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          transition: height 0.4s ease;
        }

        .customer-card::before {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
        }

        .pharmacy-card::before {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
        }

        .driver-card::before {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .app-card:hover {
          transform: translateY(-12px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
        }

        .app-card:hover::before {
          height: 100%;
          opacity: 0.05;
        }

        .card-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.4s ease;
        }

        .customer-card .card-icon {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          color: #0369a1;
        }

        .pharmacy-card .card-icon {
          background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
          color: #6d28d9;
        }

        .driver-card .card-icon {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #047857;
        }

        .app-card:hover .card-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .app-card h2 {
          font-size: 28px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .app-card p {
          font-size: 16px;
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 24px;
          min-height: 48px;
        }

        .card-btn {
          width: 100%;
          padding: 14px 24px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
        }

        .customer-card .card-btn {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          color: white;
        }

        .pharmacy-card .card-btn {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
        }

        .driver-card .card-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        }

        .main-footer {
          text-align: center;
          padding: 24px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
          position: relative;
          z-index: 1;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 40px;
          }

          .hero-subtitle {
            font-size: 18px;
            margin-bottom: 40px;
          }

          .app-cards {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default MainLanding;
