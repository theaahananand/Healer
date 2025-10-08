import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { CustomerContext } from '../CustomerApp';
import { User, Mail, Phone, Camera, Lock, Shield, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const CustomerProfile = () => {
  const { user, API, updateUser } = useContext(CustomerContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile data
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  
  // Verification states
  const [showVerification, setShowVerification] = useState(false);
  const [verificationType, setVerificationType] = useState(''); // 'email' or 'phone'
  const [verificationValue, setVerificationValue] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Picture upload
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Resend timer effect
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(timer => {
          if (timer <= 1) {
            setCanResend(true);
            return 0;
          }
          return timer - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleProfilePicture = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/profile/upload-picture`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      updateUser({ ...user, profile_pic: response.data.profile_pic });
      setSuccess('Profile picture updated successfully');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  const startVerification = (type, value) => {
    setVerificationType(type);
    setVerificationValue(value);
    setShowVerification(true);
    setVerificationSent(false);
    setVerificationCode('');
    setError('');
    setSuccess('');
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API}/verification/send-code`, {
        type: verificationType,
        value: verificationValue
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      setVerificationSent(true);
      setCanResend(false);
      setResendTimer(30);
      setSuccess(`Verification code sent to ${verificationValue} (Demo code: ${response.data.code})`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API}/verification/verify-code`, {
        type: verificationType,
        value: verificationValue,
        code: verificationCode
      }, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccess('Verification successful! You can now update your profile.');
      setShowVerification(false);
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.put(`${API}/profile`, profileData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      updateUser(response.data.user);
      setSuccess('Profile updated successfully');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Failed to update profile';
      if (errorMsg.includes('verification required')) {
        const isEmail = errorMsg.includes('Email');
        startVerification(isEmail ? 'email' : 'phone', isEmail ? profileData.email : profileData.phone);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <div className="profile-page">
        <div className="verification-card">
          <div className="verification-header">
            <Shield size={48} className="verification-icon" />
            <h2>Verify {verificationType === 'email' ? 'Email' : 'Phone Number'}</h2>
            <p>We need to verify your new {verificationType} before updating your profile</p>
          </div>

          {error && <div className="error"><AlertCircle size={16} />{error}</div>}
          {success && <div className="success"><CheckCircle size={16} />{success}</div>}

          {!verificationSent ? (
            <div className="verification-form">
              <div className="form-group">
                <label>
                  {verificationType === 'email' ? <Mail size={18} /> : <Phone size={18} />}
                  {verificationType === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <input
                  type={verificationType === 'email' ? 'email' : 'tel'}
                  value={verificationValue}
                  onChange={(e) => setVerificationValue(e.target.value)}
                  placeholder={verificationType === 'email' ? 'Enter your email' : 'Enter your phone number'}
                />
              </div>
              <button onClick={sendVerificationCode} disabled={loading || !verificationValue} className="btn-primary">
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <div className="verification-form">
              <div className="form-group">
                <label><Lock size={18} /> Verification Code</label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                />
              </div>
              
              <button onClick={verifyCode} disabled={loading || verificationCode.length !== 6} className="btn-primary">
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <div className="resend-section">
                {canResend ? (
                  <button onClick={sendVerificationCode} disabled={loading} className="btn-link">
                    Resend Code
                  </button>
                ) : (
                  <span className="resend-timer">
                    <Clock size={16} /> Resend in {resendTimer}s
                  </span>
                )}
              </div>
            </div>
          )}

          <button onClick={() => setShowVerification(false)} className="btn-secondary">
            Cancel
          </button>
        </div>

        <style jsx>{`
          .profile-page { min-height: 100vh; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); display: flex; align-items: center; justify-content: center; padding: 24px; }
          .verification-card { background: white; border-radius: 24px; padding: 40px; max-width: 500px; width: 100%; text-align: center; }
          .verification-header { margin-bottom: 32px; }
          .verification-icon { color: #0ea5e9; margin-bottom: 16px; }
          .verification-header h2 { font-size: 24px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
          .verification-header p { color: #64748b; }
          .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; justify-content: center; }
          .success { background: #d1fae5; color: #065f46; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; justify-content: center; }
          .verification-form { margin-bottom: 24px; }
          .form-group { margin-bottom: 20px; text-align: left; }
          .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px; }
          .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px; }
          .form-group input:focus { outline: none; border-color: #0ea5e9; }
          .btn-primary { width: 100%; padding: 14px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s; margin-bottom: 16px; }
          .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); }
          .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
          .btn-secondary { width: 100%; padding: 14px; background: #f1f5f9; color: #64748b; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; }
          .btn-link { background: none; border: none; color: #0ea5e9; font-weight: 600; cursor: pointer; padding: 8px; font-size: 14px; }
          .resend-section { margin-top: 16px; }
          .resend-timer { color: #64748b; font-size: 14px; display: flex; align-items: center; gap: 4px; justify-content: center; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p>Manage your account settings and preferences</p>
        </div>

        {error && <div className="error"><AlertCircle size={16} />{error}</div>}
        {success && <div className="success"><CheckCircle size={16} />{success}</div>}

        {/* Profile Picture Section */}
        <div className="profile-picture-section">
          <div className="picture-container">
            {user?.profile_pic ? (
              <img src={user.profile_pic} alt="Profile" className="profile-pic" />
            ) : (
              <div className="profile-pic-placeholder">
                <User size={48} />
              </div>
            )}
            
            <label className="upload-btn" htmlFor="profile-pic-input">
              <Camera size={16} />
              {uploading ? 'Uploading...' : 'Change Picture'}
            </label>
            <input
              id="profile-pic-input"
              type="file"
              accept="image/*"
              onChange={handleProfilePicture}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleProfileUpdate} className="profile-form">
          <div className="form-group">
            <label><User size={18} /> Name</label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              placeholder="Enter your name"
            />
          </div>

          <div className="form-group">
            <label>
              <Mail size={18} /> Email
              {user?.email_verified && <CheckCircle size={14} className="verified-icon" />}
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              placeholder="Enter your email"
            />
            {profileData.email !== user?.email && (
              <small className="change-note">Email change requires verification</small>
            )}
          </div>

          <div className="form-group">
            <label>
              <Phone size={18} /> Phone
              {user?.phone_verified && <CheckCircle size={14} className="verified-icon" />}
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              placeholder="Enter your phone number"
            />
            {profileData.phone !== user?.phone && (
              <small className="change-note">Phone change requires verification</small>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>

        {/* Account Status */}
        <div className="account-status">
          <h3>Account Status</h3>
          <div className="status-item">
            <Mail size={16} />
            <span>Email Verification</span>
            <span className={`status ${user?.email_verified ? 'verified' : 'pending'}`}>
              {user?.email_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div className="status-item">
            <Phone size={16} />
            <span>Phone Verification</span>
            <span className={`status ${user?.phone_verified ? 'verified' : 'pending'}`}>
              {user?.phone_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-page { min-height: 100vh; background: #f8fafc; padding: 24px; }
        .profile-container { max-width: 600px; margin: 0 auto; }
        .profile-header { text-align: center; margin-bottom: 32px; }
        .profile-header h1 { font-size: 32px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        .profile-header p { color: #64748b; }
        .error { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        .success { background: #d1fae5; color: #065f46; padding: 12px; border-radius: 10px; margin-bottom: 20px; font-size: 14px; display: flex; align-items: center; gap: 8px; }
        
        .profile-picture-section { text-align: center; margin-bottom: 32px; }
        .picture-container { display: inline-block; position: relative; }
        .profile-pic { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #0ea5e9; }
        .profile-pic-placeholder { width: 120px; height: 120px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748b; border: 4px solid #e2e8f0; }
        .upload-btn { position: absolute; bottom: 0; right: 0; background: #0ea5e9; color: white; padding: 8px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; border: 2px solid white; }
        
        .profile-form { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); margin-bottom: 24px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; color: #374151; font-size: 14px; }
        .verified-icon { color: #10b981; }
        .form-group input { width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 10px; font-size: 15px; }
        .form-group input:focus { outline: none; border-color: #0ea5e9; }
        .change-note { color: #f59e0b; font-size: 12px; display: block; margin-top: 4px; }
        .btn-submit { width: 100%; padding: 14px; background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.3s; }
        .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
        
        .account-status { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1); }
        .account-status h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }
        .status-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .status-item:last-child { border-bottom: none; }
        .status-item span:nth-child(2) { flex: 1; font-weight: 500; color: #374151; }
        .status { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status.verified { background: #d1fae5; color: #065f46; }
        .status.pending { background: #fef3c7; color: #92400e; }
      `}</style>
    </div>
  );
};

export default CustomerProfile;