import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, TrendingUp, Users, DollarSign, Pill } from 'lucide-react';

const PharmacyLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="pharmacy-landing">
      <nav className="navbar">
        <div className="logo">
          <Pill size={32} />
          <span>Healer Business</span>
        </div>
        <button onClick={() => navigate('/pharmacy/auth')} data-testid="signin-btn">Sign In</button>
      </nav>

      <section className="hero">
        <h1 data-testid="hero-title">
          Grow Your <span className="highlight">Pharmacy Business</span>
        </h1>
        <p>Join Healer and reach more customers. Manage orders, inventory, and boost sales—all from one dashboard.</p>
        <button onClick={() => navigate('/pharmacy/auth')} data-testid="get-started-btn">Get Started</button>
      </section>

      <section className="benefits">
        <div className="benefit">
          <Store size={40} />
          <h3>Reach More Customers</h3>
          <p>Get discovered by customers searching for medicines in your area</p>
        </div>
        <div className="benefit">
          <TrendingUp size={40} />
          <h3>Increase Revenue</h3>
          <p>Grow your sales with online orders and delivery</p>
        </div>
        <div className="benefit">
          <Users size={40} />
          <h3>Easy Management</h3>
          <p>Simple dashboard to manage inventory and orders</p>
        </div>
        <div className="benefit">
          <DollarSign size={40} />
          <h3>No Setup Fees</h3>
          <p>Join for free, pay only per transaction</p>
        </div>
      </section>

      <style jsx>{`
        .pharmacy-landing { min-height: 100vh; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
        .navbar { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
        .logo { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 800; color: white; }
        .navbar button { padding: 10px 24px; background: white; color: #8b5cf6; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .hero { text-align: center; padding: 100px 24px; color: white; }
        .hero h1 { font-size: 64px; font-weight: 800; margin-bottom: 24px; }
        .highlight { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .hero p { font-size: 22px; margin-bottom: 40px; opacity: 0.95; max-width: 700px; margin-left: auto; margin-right: auto; }
        .hero button { padding: 16px 40px; background: white; color: #8b5cf6; border: none; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; }
        .benefits { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 32px; max-width: 1200px; margin: 0 auto; padding: 80px 24px; background: white; }
        .benefit { text-align: center; padding: 32px; }
        .benefit svg { color: #8b5cf6; margin-bottom: 16px; }
        .benefit h3 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
        .benefit p { color: #64748b; }
        @media (max-width: 768px) { .hero h1 { font-size: 40px; } }
      `}</style>
    </div>
  );
};

export default PharmacyLanding;