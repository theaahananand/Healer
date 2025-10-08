import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Clock, DollarSign, MapPin, Pill } from 'lucide-react';

const DriverLanding = () => {
  const navigate = useNavigate();

  return (
    <div className="driver-landing">
      <nav className="navbar">
        <div className="logo">
          <Pill size={32} />
          <span>Healer Delivery</span>
        </div>
        <button onClick={() => navigate('/driver/auth')} data-testid="signin-btn">Sign In</button>
      </nav>

      <section className="hero">
        <h1 data-testid="hero-title">
          Earn by <span className="highlight">Delivering Medicines</span>
        </h1>
        <p>Join Healer as a delivery partner. Work on your schedule, earn competitive pay, and be a healthcare hero.</p>
        <button onClick={() => navigate('/driver/auth')} data-testid="get-started-btn">Become a Partner</button>
      </section>

      <section className="benefits">
        <div className="benefit">
          <Clock size={40} />
          <h3>Flexible Hours</h3>
          <p>Work whenever you want, no fixed schedule</p>
        </div>
        <div className="benefit">
          <DollarSign size={40} />
          <h3>Great Earnings</h3>
          <p>Competitive pay per delivery with weekly payouts</p>
        </div>
        <div className="benefit">
          <MapPin size={40} />
          <h3>Easy Navigation</h3>
          <p>Simple app with GPS navigation to customer</p>
        </div>
        <div className="benefit">
          <Truck size={40} />
          <h3>Quick Deliveries</h3>
          <p>Short distance deliveries in your area</p>
        </div>
      </section>

      <style jsx>{`
        .driver-landing { min-height: 100vh; background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .navbar { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; max-width: 1200px; margin: 0 auto; }
        .logo { display: flex; align-items: center; gap: 12px; font-size: 28px; font-weight: 800; color: white; }
        .navbar button { padding: 10px 24px; background: white; color: #10b981; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .hero { text-align: center; padding: 100px 24px; color: white; }
        .hero h1 { font-size: 64px; font-weight: 800; margin-bottom: 24px; }
        .highlight { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
        .hero p { font-size: 22px; margin-bottom: 40px; opacity: 0.95; max-width: 700px; margin-left: auto; margin-right: auto; }
        .hero button { padding: 16px 40px; background: white; color: #10b981; border: none; border-radius: 12px; font-size: 18px; font-weight: 700; cursor: pointer; }
        .benefits { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 32px; max-width: 1200px; margin: 0 auto; padding: 80px 24px; background: white; }
        .benefit { text-align: center; padding: 32px; }
        .benefit svg { color: #10b981; margin-bottom: 16px; }
        .benefit h3 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
        .benefit p { color: #64748b; }
        @media (max-width: 768px) { .hero h1 { font-size: 40px; } }
      `}</style>
    </div>
  );
};

export default DriverLanding;