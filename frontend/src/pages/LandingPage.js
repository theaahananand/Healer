import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Pill, TruckIcon, StoreIcon, Clock, MapPin, Shield } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate(`/${user.role}`);
    }
  }, [user, navigate]);

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <nav className="navbar">
          <div className="nav-container">
            <div className="logo">
              <Pill className="logo-icon" />
              <span className="logo-text">Healer</span>
            </div>
            <div className="nav-links">
              <button className="btn-link" onClick={() => navigate('/auth/customer')}>Sign In</button>
            </div>
          </div>
        </nav>

        <div className="hero-content">
          <h1 className="hero-title" data-testid="hero-title">
            Medicines Delivered in <span className="highlight">Minutes</span>
          </h1>
          <p className="hero-subtitle" data-testid="hero-subtitle">
            Order from nearby pharmacies and get your medicines delivered fast.
            Compare prices, track in real-time, and never run out of essentials.
          </p>
          
          <div className="cta-buttons">
            <button 
              className="btn btn-primary btn-large" 
              onClick={() => navigate('/auth/customer')}
              data-testid="customer-cta-btn"
            >
              Order Medicines
            </button>
            <button 
              className="btn btn-secondary btn-large" 
              onClick={() => navigate('/auth/pharmacy')}
              data-testid="pharmacy-cta-btn"
            >
              Join as Pharmacy
            </button>
          </div>

          <div className="stats-bar">
            <div className="stat-item">
              <div className="stat-value">8-15</div>
              <div className="stat-label">Minutes Delivery</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">100+</div>
              <div className="stat-label">Local Pharmacies</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-value">24/7</div>
              <div className="stat-label">Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why Choose Healer?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Clock />
            </div>
            <h3 className="feature-title">Lightning Fast Delivery</h3>
            <p className="feature-desc">
              Get your medicines delivered in 8-15 minutes from nearby pharmacies.
              Because health can't wait.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <MapPin />
            </div>
            <h3 className="feature-title">Real-Time Tracking</h3>
            <p className="feature-desc">
              Track your order from pharmacy to doorstep with live location updates
              and accurate ETAs.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <StoreIcon />
            </div>
            <h3 className="feature-title">Compare Prices</h3>
            <p className="feature-desc">
              See prices from multiple pharmacies instantly and choose the best deal
              for your medicines.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Shield />
            </div>
            <h3 className="feature-title">Verified Pharmacies</h3>
            <p className="feature-desc">
              All pharmacies are licensed and verified. Get authentic medicines with
              complete safety.
            </p>
          </div>
        </div>
      </section>

      {/* For Pharmacies Section */}
      <section className="pharmacies-section">
        <div className="section-container">
          <div className="content-split">
            <div className="content-left">
              <h2 className="section-heading">Join Healer as a Pharmacy</h2>
              <p className="section-text">
                Grow your business by reaching more customers online. Accept orders,
                manage inventory, and increase your revenue with zero upfront costs.
              </p>
              <ul className="benefits-list">
                <li>✓ Reach customers in your area instantly</li>
                <li>✓ Easy-to-use dashboard for order management</li>
                <li>✓ Flexible delivery with our driver network</li>
                <li>✓ No setup fees, pay only per transaction</li>
              </ul>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/auth/pharmacy')}
                data-testid="pharmacy-join-btn"
              >
                Register Your Pharmacy
              </button>
            </div>
            <div className="content-right">
              <div className="illustration-placeholder">
                <StoreIcon size={120} className="illustration-icon" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Drivers Section */}
      <section className="drivers-section">
        <div className="section-container">
          <div className="content-split reverse">
            <div className="content-left">
              <div className="illustration-placeholder">
                <TruckIcon size={120} className="illustration-icon" />
              </div>
            </div>
            <div className="content-right">
              <h2 className="section-heading">Become a Delivery Partner</h2>
              <p className="section-text">
                Earn flexible income by delivering medicines. Work on your own schedule
                and be a healthcare hero in your community.
              </p>
              <ul className="benefits-list">
                <li>✓ Flexible working hours</li>
                <li>✓ Competitive earnings per delivery</li>
                <li>✓ Weekly payouts</li>
                <li>✓ Simple app-based navigation</li>
              </ul>
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/auth/driver')}
                data-testid="driver-join-btn"
              >
                Join as Driver
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Pill className="footer-logo" />
            <span className="footer-brand-text">Healer</span>
          </div>
          <p className="footer-tagline">Making healthcare accessible, one delivery at a time.</p>
          <p className="footer-copy">© 2025 Healer. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        .landing-page {
          width: 100%;
          overflow-x: hidden;
        }

        /* Navbar */
        .navbar {
          position: fixed;
          top: 0;
          width: 100%;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(14, 165, 233, 0.1);
          z-index: 100;
          padding: 16px 0;
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
          font-size: 24px;
          font-weight: 700;
          color: #0ea5e9;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
        }

        .btn-link {
          background: none;
          border: none;
          color: #374151;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          padding: 8px 16px;
          transition: color 0.3s ease;
        }

        .btn-link:hover {
          color: #0ea5e9;
        }

        /* Hero Section */
        .hero-section {
          min-height: 100vh;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 50%, #0891b2 100%);
          position: relative;
          padding-top: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .hero-section::before {
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

        .hero-content {
          max-width: 900px;
          margin: 0 auto;
          padding: 80px 24px;
          text-align: center;
          position: relative;
          z-index: 1;
        }

        .hero-title {
          font-size: 72px;
          font-weight: 800;
          color: white;
          margin-bottom: 24px;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .highlight {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: 22px;
          color: rgba(255, 255, 255, 0.95);
          margin-bottom: 48px;
          line-height: 1.6;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          margin-bottom: 64px;
          flex-wrap: wrap;
        }

        .btn-large {
          padding: 16px 40px;
          font-size: 18px;
          font-weight: 700;
        }

        .stats-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 48px;
          padding: 32px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-item {
          text-align: center;
        }

        .stat-value {
          font-size: 36px;
          font-weight: 800;
          color: white;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        .stat-divider {
          width: 1px;
          height: 40px;
          background: rgba(255, 255, 255, 0.3);
        }

        /* Features Section */
        .features-section {
          padding: 100px 24px;
          background: #f8fafc;
        }

        .section-title {
          text-align: center;
          font-size: 48px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 64px;
        }

        .features-grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 32px;
        }

        .feature-card {
          background: white;
          padding: 40px 32px;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 40px rgba(14, 165, 233, 0.15);
        }

        .feature-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          margin-bottom: 24px;
        }

        .feature-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
        }

        .feature-desc {
          font-size: 16px;
          color: #64748b;
          line-height: 1.6;
        }

        /* Pharmacies & Drivers Sections */
        .pharmacies-section,
        .drivers-section {
          padding: 100px 24px;
        }

        .pharmacies-section {
          background: white;
        }

        .drivers-section {
          background: #f8fafc;
        }

        .section-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .content-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .content-split.reverse {
          direction: rtl;
        }

        .content-split.reverse > * {
          direction: ltr;
        }

        .section-heading {
          font-size: 48px;
          font-weight: 800;
          color: #1e293b;
          margin-bottom: 24px;
          line-height: 1.2;
        }

        .section-text {
          font-size: 18px;
          color: #64748b;
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .benefits-list {
          list-style: none;
          margin-bottom: 32px;
        }

        .benefits-list li {
          font-size: 16px;
          color: #374151;
          margin-bottom: 16px;
          padding-left: 8px;
          font-weight: 500;
        }

        .illustration-placeholder {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          border-radius: 24px;
          padding: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 60px rgba(14, 165, 233, 0.3);
        }

        .illustration-icon {
          color: white;
          opacity: 0.9;
        }

        /* Footer */
        .footer {
          background: #1e293b;
          padding: 60px 24px;
          text-align: center;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .footer-logo {
          width: 32px;
          height: 32px;
          color: #0ea5e9;
        }

        .footer-brand-text {
          font-size: 24px;
          font-weight: 700;
          color: white;
        }

        .footer-tagline {
          font-size: 16px;
          color: #94a3b8;
          margin-bottom: 24px;
        }

        .footer-copy {
          font-size: 14px;
          color: #64748b;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 48px;
          }

          .hero-subtitle {
            font-size: 18px;
          }

          .stats-bar {
            flex-direction: column;
            gap: 24px;
          }

          .stat-divider {
            display: none;
          }

          .content-split,
          .content-split.reverse {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .section-heading {
            font-size: 36px;
          }

          .section-title {
            font-size: 36px;
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
