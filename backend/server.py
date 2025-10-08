from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import requests
import razorpay
import json
import re
import secrets
from fastapi import File, UploadFile
import base64


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'healer-super-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 720  # 30 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Razorpay client (will be initialized when keys are provided)
razorpay_client = None
try:
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET')
    if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
        razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
except Exception as e:
    logging.warning(f"Razorpay client initialization failed: {e}")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer(auto_error=False)

# ==================== MODELS ====================

class UserRole:
    CUSTOMER = "customer"
    PHARMACY = "pharmacy"
    DRIVER = "driver"

class OrderStatus:
    PENDING = "pending"
    ACCEPTED = "accepted"
    PREPARING = "preparing"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class PaymentMethod:
    CASH_ON_DELIVERY = "cash_on_delivery"
    UPI = "upi"
    CARD = "card"
    PAYPAL = "paypal"

# User Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    role: str  # customer, pharmacy, driver

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    profile_pic: Optional[str] = None
    reward_points: int = 0
    is_healer_pro: bool = False
    healer_pro_expires_at: Optional[str] = None
    email_verified: bool = False
    phone_verified: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Session Models
class SessionData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Pharmacy Models
class Location(BaseModel):
    lat: float
    lng: float
    address: str

class PharmacyCreate(BaseModel):
    business_name: str
    location: Location
    contact_phone: str
    operating_hours: str
    license_number: str

class Pharmacy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_id: str
    business_name: str
    location: Location
    contact_phone: str
    operating_hours: str
    license_number: str
    is_active: bool = True
    rating: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Medicine Models
class MedicineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    category: Optional[str] = None
    requires_prescription: bool = False
    image_url: Optional[str] = None

class Medicine(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pharmacy_id: str
    name: str
    description: Optional[str] = None
    price: float
    stock_quantity: int
    category: Optional[str] = None
    requires_prescription: bool = False
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Order Models
class OrderItem(BaseModel):
    medicine_id: str
    medicine_name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    pharmacy_id: str
    items: List[OrderItem]
    delivery_address: Location
    payment_method: str
    phone: str
    use_reward_points: bool = False
    notes: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    pharmacy_id: str
    driver_id: Optional[str] = None
    items: List[OrderItem]
    item_total: float = 0.0
    delivery_fee: float = 0.0
    platform_fee: float = 5.0  # Fixed platform fee
    discount_amount: float = 0.0
    points_redeemed: int = 0
    points_earned: int = 0
    total_amount: float = 0.0
    delivery_address: Location
    phone: str
    status: str = OrderStatus.PENDING
    payment_method: str
    payment_status: str = "pending"
    razorpay_order_id: Optional[str] = None
    distance_km: float = 0.0
    estimated_time: int = 0  # in minutes
    cancellation_charge: float = 0.0
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Driver Models
class DriverCreate(BaseModel):
    vehicle_type: str
    license_number: str
    vehicle_number: str
    address: str
    city: str
    state: str
    aadhaar_number: str

class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    vehicle_type: str
    license_number: str
    vehicle_number: str
    address: str
    city: str
    state: str
    aadhaar_number: str
    current_location: Optional[Location] = None
    is_available: bool = True
    is_verified: bool = False
    rating: float = 0.0
    total_earnings: float = 0.0
    total_deliveries: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Delivery Rate by State (INR)
STATE_DELIVERY_RATES = {
    "Delhi": {"base": 25, "per_km": 8},
    "Maharashtra": {"base": 30, "per_km": 10},
    "Karnataka": {"base": 28, "per_km": 9},
    "Tamil Nadu": {"base": 25, "per_km": 8},
    "Uttar Pradesh": {"base": 20, "per_km": 7},
    "Gujarat": {"base": 25, "per_km": 8},
    "West Bengal": {"base": 22, "per_km": 7},
    "Rajasthan": {"base": 23, "per_km": 7},
    "default": {"base": 25, "per_km": 8}
}

class DriverEarning(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    order_id: str
    amount: float
    distance_km: float
    state: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DriverReview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    driver_id: str
    customer_id: str
    rating: int  # 1-5
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Payment Models
class CreateRazorpayOrder(BaseModel):
    order_id: str
    amount: float

class VerifyPayment(BaseModel):
    order_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# Profile Management Models
class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class SendVerificationRequest(BaseModel):
    type: str  # "email" or "phone"
    value: str  # new email or phone number

class VerifyCodeRequest(BaseModel):
    type: str  # "email" or "phone"
    value: str  # email or phone number
    code: str

# Verification Storage Model
class VerificationCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # "email" or "phone"
    value: str  # email or phone number
    code: str
    expires_at: datetime
    verified: bool = False
    resend_count: int = 0
    last_resent_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPER FUNCTIONS ====================

def validate_password(password: str) -> tuple[bool, str]:
    """Validate password requirements"""
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    if not re.search(r'[@#$%^&+=!]', password):
        return False, "Password must contain at least one special character (@#$%^&+=!)"
    
    return True, "Password is valid"

def validate_email(email: str) -> tuple[bool, str]:
    """Basic email validation"""
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Invalid email format"
    return True, "Email is valid"

def create_jwt_token(user_id: str, role: str) -> str:
    """Create JWT token for user"""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict:
    """Get current user from JWT token or session cookie"""
    token = None
    
    # Try to get token from cookie first
    session_token = request.cookies.get('session_token')
    if session_token:
        # Verify session token from Emergent Auth or custom session
        session = await db.sessions.find_one({"session_token": session_token})
        if session and session['expires_at'] > datetime.now(timezone.utc).isoformat():
            user = await db.users.find_one({"id": session['user_id']}, {"_id": 0})
            if user:
                return user
    
    # Try to get token from Authorization header
    if credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = verify_jwt_token(token)
    user = await db.users.find_one({"id": payload['user_id']}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in km (simple approximation)"""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in km
    
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    distance = R * c
    
    return round(distance, 2)

def estimate_delivery_time(distance_km: float) -> int:
    """Estimate delivery time in minutes based on distance"""
    # Simple estimation: 5 min base + 2 min per km
    return int(5 + (distance_km * 2))

def calculate_delivery_fee(distance_km: float, is_healer_pro: bool) -> float:
    """Calculate delivery fee based on distance and membership"""
    if is_healer_pro:
        return 0.0
    
    # Delivery fee calculation like Swiggy/Zomato
    if distance_km <= 2:
        return 20.0
    elif distance_km <= 5:
        return 30.0
    elif distance_km <= 10:
        return 50.0
    else:
        return 70.0

def calculate_driver_earning(distance_km: float, state: str) -> float:
    """Calculate driver earnings based on distance and state"""
    rates = STATE_DELIVERY_RATES.get(state, STATE_DELIVERY_RATES["default"])
    return rates["base"] + (distance_km * rates["per_km"])

def calculate_reward_points(order_amount: float) -> int:
    """Calculate reward points: 1 point per ₹20 spent"""
    return int(order_amount / 20)

def calculate_discount_from_points(points_used: int) -> float:
    """Convert points to discount: 1 point = ₹0.25"""
    return points_used * 0.25

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    """Register a new user with validation"""
    # Validate email
    email_valid, email_msg = validate_email(user_data.email)
    if not email_valid:
        raise HTTPException(status_code=400, detail=email_msg)
    
    # Validate password
    pwd_valid, pwd_msg = validate_password(user_data.password)
    if not pwd_valid:
        raise HTTPException(status_code=400, detail=pwd_msg)
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered. Please login instead.")
    
    # Validate phone for non-customer roles
    if user_data.role in ['pharmacy', 'driver'] and not user_data.phone:
        raise HTTPException(status_code=400, detail=f"Phone number is required for {user_data.role} registration")
    
    # Hash password
    hashed_password = pwd_context.hash(user_data.password)
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role
    )
    
    user_dict = user.model_dump()
    user_dict['password_hash'] = hashed_password
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create JWT token
    token = create_jwt_token(user.id, user.role)
    
    return {
        "user": user,
        "token": token,
        "message": "Registration successful"
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login user with email and password"""
    # Validate email format
    email_valid, email_msg = validate_email(credentials.email)
    if not email_valid:
        raise HTTPException(status_code=400, detail=email_msg)
    
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="No account found with this email. Please sign up first.")
    
    # Verify password
    if not pwd_context.verify(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Incorrect password. Please try again or use 'Forgot Password'.")
    
    # Create JWT token
    token = create_jwt_token(user['id'], user['role'])
    
    # Remove password hash from response
    user.pop('password_hash', None)
    user.pop('_id', None)
    
    return {
        "user": user,
        "token": token,
        "message": "Login successful"
    }

@api_router.post("/auth/google-session")
async def process_google_session(x_session_id: str = Header(...), response: Response = None):
    """Process Google OAuth session from Emergent Auth"""
    try:
        # Call Emergent Auth API to get user data
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": x_session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")
        
        auth_data = auth_response.json()
        
        # Check if user exists
        user = await db.users.find_one({"email": auth_data['email']})
        
        if not user:
            # Create new customer user
            new_user = User(
                email=auth_data['email'],
                name=auth_data['name'],
                role=UserRole.CUSTOMER,
                profile_pic=auth_data.get('picture')
            )
            user_dict = new_user.model_dump()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            await db.users.insert_one(user_dict)
            user = user_dict
        
        # Create session
        session = SessionData(
            user_id=user['id'],
            session_token=auth_data['session_token'],
            expires_at=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        session_dict = session.model_dump()
        session_dict['created_at'] = session_dict['created_at'].isoformat()
        session_dict['expires_at'] = session_dict['expires_at'].isoformat()
        
        await db.sessions.insert_one(session_dict)
        
        # Set httpOnly cookie
        if response:
            response.set_cookie(
                key="session_token",
                value=auth_data['session_token'],
                httponly=True,
                secure=True,
                samesite="none",
                max_age=7*24*60*60,  # 7 days
                path="/"
            )
        
        user.pop('password_hash', None)
        user.pop('_id', None)
        
        return {
            "user": user,
            "session_token": auth_data['session_token'],
            "message": "Google authentication successful"
        }
        
    except HTTPException:
        # Re-raise HTTPExceptions as-is
        raise
    except Exception as e:
        logging.error(f"Google session error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication failed")

@api_router.get("/auth/me")
async def get_me(current_user: Dict = Depends(get_current_user)):
    """Get current user info"""
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get('session_token')
    if session_token:
        await db.sessions.delete_one({"session_token": session_token})
        response.delete_cookie("session_token", path="/")
    
    return {"message": "Logout successful"}

@api_router.post("/auth/forgot-password")
async def forgot_password(email: EmailStr):
    """Send password reset OTP to email"""
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If this email exists, a reset link will be sent"}
    
    # Generate OTP
    otp = secrets.randbelow(900000) + 100000  # 6-digit OTP
    
    # Store OTP with expiry (10 minutes)
    await db.password_resets.update_one(
        {"email": email},
        {
            "$set": {
                "otp": str(otp),
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    # In production, send email here
    # For now, return OTP (remove in production!)
    logging.info(f"Password reset OTP for {email}: {otp}")
    
    return {
        "message": "Password reset OTP sent to your email",
        "otp": str(otp)  # Remove this in production!
    }

@api_router.post("/auth/verify-otp")
async def verify_otp(email: EmailStr, otp: str):
    """Verify OTP for password reset"""
    reset_record = await db.password_resets.find_one({"email": email})
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="No reset request found for this email")
    
    if datetime.fromisoformat(reset_record['expires_at']) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one")
    
    if reset_record['otp'] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP. Please try again")
    
    # Mark OTP as verified
    await db.password_resets.update_one(
        {"email": email},
        {"$set": {"verified": True}}
    )
    
    return {"message": "OTP verified successfully"}

@api_router.post("/auth/reset-password")
async def reset_password(email: EmailStr, otp: str, new_password: str, confirm_password: str):
    """Reset password after OTP verification"""
    # Check if passwords match
    if new_password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Validate new password
    pwd_valid, pwd_msg = validate_password(new_password)
    if not pwd_valid:
        raise HTTPException(status_code=400, detail=pwd_msg)
    
    reset_record = await db.password_resets.find_one({"email": email})
    
    if not reset_record or not reset_record.get('verified'):
        raise HTTPException(status_code=400, detail="Please verify OTP first")
    
    if reset_record['otp'] != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Hash new password
    hashed_password = pwd_context.hash(new_password)
    
    # Update user password
    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": hashed_password}}
    )
    
    # Delete reset record
    await db.password_resets.delete_one({"email": email})
    
    return {"message": "Password reset successful. Please login with your new password"}

# ==================== PHARMACY ROUTES ====================

@api_router.post("/pharmacies", response_model=Pharmacy)
async def create_pharmacy(pharmacy_data: PharmacyCreate, current_user: Dict = Depends(get_current_user)):
    """Create a new pharmacy (pharmacy owners only)"""
    if current_user['role'] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can create pharmacies")
    
    # Check if pharmacy already exists for this user
    existing = await db.pharmacies.find_one({"owner_id": current_user['id']})
    if existing:
        raise HTTPException(status_code=400, detail="Pharmacy already exists for this user")
    
    pharmacy = Pharmacy(
        owner_id=current_user['id'],
        **pharmacy_data.model_dump()
    )
    
    pharmacy_dict = pharmacy.model_dump()
    pharmacy_dict['created_at'] = pharmacy_dict['created_at'].isoformat()
    
    await db.pharmacies.insert_one(pharmacy_dict)
    
    return pharmacy

@api_router.get("/pharmacies/my", response_model=Pharmacy)
async def get_my_pharmacy(current_user: Dict = Depends(get_current_user)):
    """Get pharmacy for current user"""
    if current_user['role'] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can access this")
    
    pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']}, {"_id": 0})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    return pharmacy

@api_router.get("/pharmacies", response_model=List[Pharmacy])
async def get_all_pharmacies():
    """Get all active pharmacies"""
    pharmacies = await db.pharmacies.find({"is_active": True}, {"_id": 0}).to_list(1000)
    return pharmacies

# ==================== MEDICINE ROUTES ====================

@api_router.post("/medicines", response_model=Medicine)
async def create_medicine(medicine_data: MedicineCreate, current_user: Dict = Depends(get_current_user)):
    """Create a new medicine (pharmacy owners only)"""
    if current_user['role'] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can add medicines")
    
    # Get pharmacy
    pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found. Please create a pharmacy first.")
    
    medicine = Medicine(
        pharmacy_id=pharmacy['id'],
        **medicine_data.model_dump()
    )
    
    medicine_dict = medicine.model_dump()
    medicine_dict['created_at'] = medicine_dict['created_at'].isoformat()
    
    await db.medicines.insert_one(medicine_dict)
    
    return medicine

@api_router.get("/medicines", response_model=List[Medicine])
async def get_medicines(pharmacy_id: Optional[str] = None):
    """Get all medicines, optionally filtered by pharmacy"""
    query = {"stock_quantity": {"$gt": 0}}
    if pharmacy_id:
        query["pharmacy_id"] = pharmacy_id
    
    medicines = await db.medicines.find(query, {"_id": 0}).to_list(1000)
    return medicines

@api_router.get("/medicines/my", response_model=List[Medicine])
async def get_my_medicines(current_user: Dict = Depends(get_current_user)):
    """Get medicines for current pharmacy"""
    if current_user['role'] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can access this")
    
    pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    medicines = await db.medicines.find({"pharmacy_id": pharmacy['id']}, {"_id": 0}).to_list(1000)
    return medicines

@api_router.get("/medicines/search")
async def search_medicines(q: str, lat: Optional[float] = None, lng: Optional[float] = None):
    """Search medicines across all pharmacies with distance and pricing info"""
    if not q:
        raise HTTPException(status_code=400, detail="Search query required")
    
    # Search medicines
    medicines = await db.medicines.find({
        "name": {"$regex": q, "$options": "i"},
        "stock_quantity": {"$gt": 0}
    }, {"_id": 0}).to_list(1000)
    
    # Get pharmacy details and calculate distances
    results = []
    for medicine in medicines:
        pharmacy = await db.pharmacies.find_one({"id": medicine['pharmacy_id']}, {"_id": 0})
        if pharmacy and pharmacy['is_active']:
            result = {
                "medicine": medicine,
                "pharmacy": pharmacy,
                "distance_km": 0.0,
                "estimated_time": 0
            }
            
            if lat and lng:
                distance = calculate_distance(
                    lat, lng,
                    pharmacy['location']['lat'],
                    pharmacy['location']['lng']
                )
                result['distance_km'] = distance
                result['estimated_time'] = estimate_delivery_time(distance)
            
            results.append(result)
    
    # Sort by price (cheapest first)
    results.sort(key=lambda x: x['medicine']['price'])
    
    return results

@api_router.put("/medicines/{medicine_id}", response_model=Medicine)
async def update_medicine(medicine_id: str, medicine_data: MedicineCreate, current_user: Dict = Depends(get_current_user)):
    """Update medicine details"""
    if current_user['role'] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can update medicines")
    
    pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    medicine = await db.medicines.find_one({"id": medicine_id, "pharmacy_id": pharmacy['id']})
    if not medicine:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    update_dict = medicine_data.model_dump()
    await db.medicines.update_one({"id": medicine_id}, {"$set": update_dict})
    
    updated = await db.medicines.find_one({"id": medicine_id}, {"_id": 0})
    return updated

@api_router.delete("/medicines/{medicine_id}")
async def delete_medicine(medicine_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete a medicine"""
    if current_user['role'] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can delete medicines")
    
    pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    result = await db.medicines.delete_one({"id": medicine_id, "pharmacy_id": pharmacy['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Medicine not found")
    
    return {"message": "Medicine deleted successfully"}

# ==================== ORDER ROUTES ====================

@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate, current_user: Dict = Depends(get_current_user)):
    """Create a new order with full pricing calculation"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can create orders")
    
    # Get user data
    user = await db.users.find_one({"id": current_user['id']})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Calculate item total
    item_total = sum(item.price * item.quantity for item in order_data.items)
    
    # Get pharmacy location to calculate distance
    pharmacy = await db.pharmacies.find_one({"id": order_data.pharmacy_id})
    if not pharmacy:
        raise HTTPException(status_code=404, detail="Pharmacy not found")
    
    distance = calculate_distance(
        order_data.delivery_address.lat,
        order_data.delivery_address.lng,
        pharmacy['location']['lat'],
        pharmacy['location']['lng']
    )
    
    # Check if COD is available (only for distance < 10km)
    if order_data.payment_method == PaymentMethod.CASH_ON_DELIVERY and distance >= 10:
        raise HTTPException(status_code=400, detail="Cash on Delivery not available for orders beyond 10km")
    
    # Calculate fees
    is_healer_pro = user.get('is_healer_pro', False)
    delivery_fee = calculate_delivery_fee(distance, is_healer_pro)
    platform_fee = 5.0
    
    # Handle reward points
    discount_amount = 0.0
    points_redeemed = 0
    if order_data.use_reward_points:
        available_points = user.get('reward_points', 0)
        # Can use up to 50% of item total
        max_discount = item_total * 0.5
        max_points = int(max_discount / 0.25)
        points_to_use = min(available_points, max_points)
        discount_amount = calculate_discount_from_points(points_to_use)
        points_redeemed = points_to_use
    
    # Calculate total
    total_amount = item_total + delivery_fee + platform_fee - discount_amount
    
    # Calculate points earned (1 point per ₹20)
    points_earned = calculate_reward_points(total_amount)
    
    estimated_time = estimate_delivery_time(distance)
    
    order = Order(
        customer_id=current_user['id'],
        pharmacy_id=order_data.pharmacy_id,
        items=order_data.items,
        item_total=item_total,
        delivery_fee=delivery_fee,
        platform_fee=platform_fee,
        discount_amount=discount_amount,
        points_redeemed=points_redeemed,
        points_earned=points_earned,
        total_amount=total_amount,
        delivery_address=order_data.delivery_address,
        phone=order_data.phone,
        payment_method=order_data.payment_method,
        distance_km=distance,
        estimated_time=estimated_time,
        notes=order_data.notes
    )
    
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Update user reward points
    new_points = user.get('reward_points', 0) - points_redeemed + points_earned
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"reward_points": new_points}}
    )
    
    return order

@api_router.get("/orders/my", response_model=List[Order])
async def get_my_orders(current_user: Dict = Depends(get_current_user)):
    """Get orders for current user based on role"""
    query = {}
    
    if current_user['role'] == UserRole.CUSTOMER:
        query['customer_id'] = current_user['id']
    elif current_user['role'] == UserRole.PHARMACY:
        pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
        if pharmacy:
            query['pharmacy_id'] = pharmacy['id']
    elif current_user['role'] == UserRole.DRIVER:
        query['driver_id'] = current_user['id']
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: Dict = Depends(get_current_user)):
    """Get order details"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check authorization
    if current_user['role'] == UserRole.CUSTOMER and order['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    elif current_user['role'] == UserRole.PHARMACY:
        pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
        if not pharmacy or order['pharmacy_id'] != pharmacy['id']:
            raise HTTPException(status_code=403, detail="Not authorized to view this order")
    elif current_user['role'] == UserRole.DRIVER and order.get('driver_id') != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    return order

@api_router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, current_user: Dict = Depends(get_current_user)):
    """Update order status"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Pharmacy can accept/reject/prepare orders
    if current_user['role'] == UserRole.PHARMACY:
        pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
        if not pharmacy or order['pharmacy_id'] != pharmacy['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if status not in [OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.PREPARING]:
            raise HTTPException(status_code=400, detail="Invalid status for pharmacy")
    
    # Driver can update pickup/delivery status
    elif current_user['role'] == UserRole.DRIVER:
        if order.get('driver_id') != current_user['id']:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if status not in [OrderStatus.PICKED_UP, OrderStatus.IN_TRANSIT, OrderStatus.DELIVERED]:
            raise HTTPException(status_code=400, detail="Invalid status for driver")
    
    else:
        raise HTTPException(status_code=403, detail="Not authorized to update order status")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Order status updated", "status": status}

@api_router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, current_user: Dict = Depends(get_current_user)):
    """Cancel an order with dynamic cancellation charges"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can cancel orders")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if order['status'] == OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Cannot cancel delivered order")
    
    if order['status'] == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Order already cancelled")
    
    # Calculate cancellation charge based on time
    created_at = datetime.fromisoformat(order['created_at'])
    time_elapsed = (datetime.now(timezone.utc) - created_at).total_seconds() / 60  # minutes
    
    cancellation_charge = 0.0
    if time_elapsed <= 2:
        cancellation_charge = 0.0
    elif time_elapsed <= 5:
        cancellation_charge = order['total_amount'] * 0.10
    elif time_elapsed <= 20:
        cancellation_charge = order['total_amount'] * 0.15
    else:
        cancellation_charge = order['total_amount']
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$set": {
                "status": OrderStatus.CANCELLED,
                "cancellation_charge": cancellation_charge,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "message": "Order cancelled",
        "cancellation_charge": cancellation_charge
    }

@api_router.post("/orders/{order_id}/assign-driver")
async def assign_driver(order_id: str, driver_id: str, current_user: Dict = Depends(get_current_user)):
    """Assign a driver to an order (pharmacy only)"""
    if current_user['role'] != UserRole.PHARMACY:
        raise HTTPException(status_code=403, detail="Only pharmacy owners can assign drivers")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    pharmacy = await db.pharmacies.find_one({"owner_id": current_user['id']})
    if not pharmacy or order['pharmacy_id'] != pharmacy['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Verify driver exists
    driver = await db.drivers.find_one({"id": driver_id})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"driver_id": driver_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Driver assigned successfully"}

# ==================== DRIVER ROUTES ====================

@api_router.post("/drivers", response_model=Driver)
async def create_driver_profile(driver_data: DriverCreate, current_user: Dict = Depends(get_current_user)):
    """Create driver profile"""
    if current_user['role'] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can create driver profiles")
    
    # Check if driver profile already exists
    existing = await db.drivers.find_one({"user_id": current_user['id']})
    if existing:
        raise HTTPException(status_code=400, detail="Driver profile already exists")
    
    driver = Driver(
        user_id=current_user['id'],
        **driver_data.model_dump()
    )
    
    driver_dict = driver.model_dump()
    driver_dict['created_at'] = driver_dict['created_at'].isoformat()
    
    await db.drivers.insert_one(driver_dict)
    
    return driver

@api_router.get("/drivers/my", response_model=Driver)
async def get_my_driver_profile(current_user: Dict = Depends(get_current_user)):
    """Get current driver profile"""
    if current_user['role'] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can access this")
    
    driver = await db.drivers.find_one({"user_id": current_user['id']}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    return driver

@api_router.get("/drivers/available-orders", response_model=List[Order])
async def get_available_orders(current_user: Dict = Depends(get_current_user)):
    """Get available orders for drivers"""
    if current_user['role'] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can access this")
    
    # Get orders that are accepted but not assigned to any driver
    orders = await db.orders.find({
        "status": OrderStatus.ACCEPTED,
        "driver_id": None
    }, {"_id": 0}).to_list(100)
    
    return orders

@api_router.put("/drivers/location")
async def update_driver_location(location: Location, current_user: Dict = Depends(get_current_user)):
    """Update driver's current location"""
    if current_user['role'] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can update location")
    
    driver = await db.drivers.find_one({"user_id": current_user['id']})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    await db.drivers.update_one(
        {"user_id": current_user['id']},
        {"$set": {"current_location": location.model_dump()}}
    )
    
    return {"message": "Location updated"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/create-razorpay-order")
async def create_razorpay_order(payment_data: CreateRazorpayOrder, current_user: Dict = Depends(get_current_user)):
    """Create Razorpay order for payment"""
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    order = await db.orders.find_one({"id": payment_data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": int(payment_data.amount * 100),  # Convert to paise
            "currency": "INR",
            "payment_capture": 1
        })
        
        # Save Razorpay order ID
        await db.orders.update_one(
            {"id": payment_data.order_id},
            {"$set": {"razorpay_order_id": razorpay_order['id']}}
        )
        
        return {
            "razorpay_order_id": razorpay_order['id'],
            "amount": razorpay_order['amount'],
            "currency": razorpay_order['currency'],
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        logging.error(f"Razorpay order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")

@api_router.post("/payments/verify")
async def verify_payment(payment_data: VerifyPayment, current_user: Dict = Depends(get_current_user)):
    """Verify Razorpay payment"""
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    order = await db.orders.find_one({"id": payment_data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['customer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    try:
        # Verify payment signature
        razorpay_client.utility.verify_payment_signature({
            'razorpay_order_id': payment_data.razorpay_order_id,
            'razorpay_payment_id': payment_data.razorpay_payment_id,
            'razorpay_signature': payment_data.razorpay_signature
        })
        
        # Update order payment status
        await db.orders.update_one(
            {"id": payment_data.order_id},
            {"$set": {"payment_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Payment verified successfully"}
    except Exception as e:
        logging.error(f"Payment verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Payment verification failed")

# ==================== CUSTOMER PROFILE ROUTES ====================

class SavedAddress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    label: str  # Home, Work, Other
    location: Location
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SavedPaymentMethod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # card, upi
    label: str
    last_four: Optional[str] = None  # Last 4 digits of card
    upi_id: Optional[str] = None
    is_default: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.post("/customer/addresses")
async def add_address(address: SavedAddress, current_user: Dict = Depends(get_current_user)):
    """Add delivery address"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can add addresses")
    
    address.user_id = current_user['id']
    address_dict = address.model_dump()
    address_dict['created_at'] = address_dict['created_at'].isoformat()
    
    await db.saved_addresses.insert_one(address_dict)
    return {"message": "Address added", "address": address}

@api_router.get("/customer/addresses")
async def get_addresses(current_user: Dict = Depends(get_current_user)):
    """Get all saved addresses"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can view addresses")
    
    addresses = await db.saved_addresses.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    return addresses

@api_router.delete("/customer/addresses/{address_id}")
async def delete_address(address_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete saved address"""
    result = await db.saved_addresses.delete_one({"id": address_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Address not found")
    return {"message": "Address deleted"}

@api_router.post("/customer/payment-methods")
async def add_payment_method(payment: SavedPaymentMethod, current_user: Dict = Depends(get_current_user)):
    """Add payment method"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can add payment methods")
    
    payment.user_id = current_user['id']
    payment_dict = payment.model_dump()
    payment_dict['created_at'] = payment_dict['created_at'].isoformat()
    
    await db.saved_payment_methods.insert_one(payment_dict)
    return {"message": "Payment method added"}

@api_router.get("/customer/payment-methods")
async def get_payment_methods(current_user: Dict = Depends(get_current_user)):
    """Get all saved payment methods"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can view payment methods")
    
    methods = await db.saved_payment_methods.find({"user_id": current_user['id']}, {"_id": 0}).to_list(100)
    return methods

@api_router.delete("/customer/payment-methods/{method_id}")
async def delete_payment_method(method_id: str, current_user: Dict = Depends(get_current_user)):
    """Delete payment method"""
    result = await db.saved_payment_methods.delete_one({"id": method_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return {"message": "Payment method deleted"}

# ==================== HEALER PRO ROUTES ====================

@api_router.post("/healer-pro/subscribe")
async def subscribe_healer_pro(current_user: Dict = Depends(get_current_user)):
    """Subscribe to Healer Pro membership"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can subscribe")
    
    # Set expiry to 1 month from now
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {
            "is_healer_pro": True,
            "healer_pro_expires_at": expires_at.isoformat()
        }}
    )
    
    return {"message": "Healer Pro activated", "expires_at": expires_at.isoformat()}

@api_router.get("/rewards/summary")
async def get_rewards_summary(current_user: Dict = Depends(get_current_user)):
    """Get user rewards summary"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can view rewards")
    
    user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    
    return {
        "reward_points": user.get('reward_points', 0),
        "is_healer_pro": user.get('is_healer_pro', False),
        "healer_pro_expires_at": user.get('healer_pro_expires_at'),
        "points_value": user.get('reward_points', 0) * 0.25
    }

# ==================== PROFILE MANAGEMENT ROUTES ====================

@api_router.get("/profile")
async def get_profile(current_user: Dict = Depends(get_current_user)):
    """Get user profile"""
    return current_user

@api_router.put("/profile")
async def update_profile(profile_data: ProfileUpdate, current_user: Dict = Depends(get_current_user)):
    """Update user profile (requires verification for email/phone changes)"""
    update_fields = {}
    
    # Only update name directly
    if profile_data.name:
        update_fields["name"] = profile_data.name
    
    # For email and phone, we need verification first
    if profile_data.email and profile_data.email != current_user.get('email'):
        # Check if verification exists and is verified
        verification = await db.verification_codes.find_one({
            "user_id": current_user['id'],
            "type": "email",
            "value": profile_data.email,
            "verified": True
        })
        if not verification:
            raise HTTPException(status_code=400, detail="Email verification required. Please verify the new email first.")
        
        # Check if email is already taken
        existing_user = await db.users.find_one({"email": profile_data.email})
        if existing_user and existing_user['id'] != current_user['id']:
            raise HTTPException(status_code=400, detail="Email already in use")
            
        update_fields["email"] = profile_data.email
        update_fields["email_verified"] = True
        
        # Clean up verification record
        await db.verification_codes.delete_many({
            "user_id": current_user['id'],
            "type": "email",
            "value": profile_data.email
        })
    
    if profile_data.phone and profile_data.phone != current_user.get('phone'):
        # Check if verification exists and is verified
        verification = await db.verification_codes.find_one({
            "user_id": current_user['id'],
            "type": "phone",
            "value": profile_data.phone,
            "verified": True
        })
        if not verification:
            raise HTTPException(status_code=400, detail="Phone verification required. Please verify the new phone number first.")
            
        update_fields["phone"] = profile_data.phone
        update_fields["phone_verified"] = True
        
        # Clean up verification record
        await db.verification_codes.delete_many({
            "user_id": current_user['id'],
            "type": "phone",
            "value": profile_data.phone
        })
    
    if update_fields:
        await db.users.update_one(
            {"id": current_user['id']},
            {"$set": update_fields}
        )
    
    # Return updated user data
    updated_user = await db.users.find_one({"id": current_user['id']}, {"_id": 0})
    updated_user.pop('password_hash', None)
    
    return {"message": "Profile updated successfully", "user": updated_user}

@api_router.post("/profile/upload-picture")
async def upload_profile_picture(file: UploadFile = File(...), current_user: Dict = Depends(get_current_user)):
    """Upload profile picture"""
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    # Validate file size (5MB max)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size must be less than 5MB")
    
    # Convert to base64 for storage (in production, use cloud storage)
    base64_image = base64.b64encode(content).decode('utf-8')
    image_url = f"data:{file.content_type};base64,{base64_image}"
    
    # Update user profile
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": {"profile_pic": image_url}}
    )
    
    return {"message": "Profile picture updated", "profile_pic": image_url}

# ==================== VERIFICATION SYSTEM ROUTES ====================

def generate_verification_code() -> str:
    """Generate 6-digit verification code"""
    return str(secrets.randbelow(900000) + 100000)

def can_resend_code(last_resent_at: Optional[str]) -> bool:
    """Check if 30 seconds have passed since last code send"""
    if not last_resent_at:
        return True
    last_resent_datetime = datetime.fromisoformat(last_resent_at)
    return datetime.now(timezone.utc) > (last_resent_datetime + timedelta(seconds=30))

@api_router.post("/verification/send-code")
async def send_verification_code(request: SendVerificationRequest, current_user: Dict = Depends(get_current_user)):
    """Send verification code for email or phone"""
    
    # Validate type
    if request.type not in ["email", "phone"]:
        raise HTTPException(status_code=400, detail="Type must be 'email' or 'phone'")
    
    # Validate value format
    if request.type == "email":
        email_valid, email_msg = validate_email(request.value)
        if not email_valid:
            raise HTTPException(status_code=400, detail=email_msg)
    elif request.type == "phone":
        if not request.value or len(request.value) < 10:
            raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Check for existing verification
    existing = await db.verification_codes.find_one({
        "user_id": current_user['id'],
        "type": request.type,
        "value": request.value
    })
    
    # Check resend limit
    if existing and existing['resend_count'] >= 5:
        raise HTTPException(status_code=400, detail="Maximum resend attempts reached. Please try again later.")
    
    # Check 30-second cooldown
    if existing and not can_resend_code(existing.get('last_resent_at')):
        raise HTTPException(status_code=400, detail="Please wait 30 seconds before requesting another code")
    
    # Generate new code
    code = generate_verification_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    if existing:
        # Update existing record
        await db.verification_codes.update_one(
            {"id": existing['id']},
            {
                "$set": {
                    "code": code,
                    "expires_at": expires_at.isoformat(),
                    "verified": False,
                    "last_resent_at": datetime.now(timezone.utc).isoformat()
                },
                "$inc": {"resend_count": 1}
            }
        )
    else:
        # Create new record
        verification = VerificationCode(
            user_id=current_user['id'],
            type=request.type,
            value=request.value,
            code=code,
            expires_at=expires_at,
            resend_count=1,
            last_resent_at=datetime.now(timezone.utc)
        )
        
        verification_dict = verification.model_dump()
        verification_dict['created_at'] = verification_dict['created_at'].isoformat()
        verification_dict['expires_at'] = verification_dict['expires_at'].isoformat()
        verification_dict['last_resent_at'] = verification_dict['last_resent_at'].isoformat()
        
        await db.verification_codes.insert_one(verification_dict)
    
    # In production, send email/SMS here
    # For now, return code (remove in production!)
    logging.info(f"Verification code for {request.type} {request.value}: {code}")
    
    return {
        "message": f"Verification code sent to {request.value}",
        "code": code,  # Remove this in production!
        "expires_in_minutes": 10
    }

@api_router.post("/verification/verify-code")
async def verify_code(request: VerifyCodeRequest, current_user: Dict = Depends(get_current_user)):
    """Verify code for email or phone"""
    
    # Find verification record
    verification = await db.verification_codes.find_one({
        "user_id": current_user['id'],
        "type": request.type,
        "value": request.value
    })
    
    if not verification:
        raise HTTPException(status_code=404, detail="No verification request found")
    
    # Check if expired
    if datetime.fromisoformat(verification['expires_at']) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    # Check code
    if verification['code'] != request.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Mark as verified
    await db.verification_codes.update_one(
        {"id": verification['id']},
        {"$set": {"verified": True}}
    )
    
    return {"message": "Verification successful"}

@api_router.post("/verification/resend-code")  
async def resend_verification_code(request: SendVerificationRequest, current_user: Dict = Depends(get_current_user)):
    """Resend verification code (30-second cooldown)"""
    # This is the same as send_verification_code but with explicit resend semantics
    return await send_verification_code(request, current_user)

# Post-signup verification for pharmacy and driver accounts
@api_router.post("/verification/send-post-signup")
async def send_post_signup_verification(request: SendVerificationRequest, current_user: Dict = Depends(get_current_user)):
    """Send post-signup verification for pharmacy and driver accounts"""
    
    # Only for pharmacy and driver roles
    if current_user['role'] not in [UserRole.PHARMACY, UserRole.DRIVER]:
        raise HTTPException(status_code=403, detail="Post-signup verification only for pharmacy and driver accounts")
    
    # Must verify their registered email/phone
    if request.type == "email" and request.value != current_user.get('email'):
        raise HTTPException(status_code=400, detail="Must verify your registered email")
    
    if request.type == "phone" and request.value != current_user.get('phone'):
        raise HTTPException(status_code=400, detail="Must verify your registered phone number")
    
    return await send_verification_code(request, current_user)

@api_router.post("/verification/complete-post-signup")
async def complete_post_signup_verification(request: VerifyCodeRequest, current_user: Dict = Depends(get_current_user)):
    """Complete post-signup verification and update user status"""
    
    # Only for pharmacy and driver roles
    if current_user['role'] not in [UserRole.PHARMACY, UserRole.DRIVER]:
        raise HTTPException(status_code=403, detail="Post-signup verification only for pharmacy and driver accounts")
    
    # Verify the code first
    await verify_code(request, current_user)
    
    # Update user verification status
    update_fields = {}
    if request.type == "email":
        update_fields["email_verified"] = True
    elif request.type == "phone":
        update_fields["phone_verified"] = True
    
    await db.users.update_one(
        {"id": current_user['id']},
        {"$set": update_fields}
    )
    
    # Clean up verification record
    await db.verification_codes.delete_many({
        "user_id": current_user['id'],
        "type": request.type,
        "value": request.value
    })
    
    return {"message": f"{request.type.title()} verification completed successfully"}

# ==================== DRIVER EARNINGS & REVIEWS ====================

@api_router.get("/drivers/earnings")
async def get_driver_earnings(current_user: Dict = Depends(get_current_user)):
    """Get driver earnings summary and history"""
    if current_user['role'] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can view earnings")
    
    driver = await db.drivers.find_one({"user_id": current_user['id']}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    # Get earnings history
    earnings = await db.driver_earnings.find({"driver_id": driver['id']}, {"_id": 0}).to_list(1000)
    
    return {
        "total_earnings": driver.get('total_earnings', 0.0),
        "total_deliveries": driver.get('total_deliveries', 0),
        "rating": driver.get('rating', 0.0),
        "state": driver.get('state'),
        "earnings_history": earnings
    }

@api_router.get("/drivers/reviews")
async def get_driver_reviews(current_user: Dict = Depends(get_current_user)):
    """Get driver reviews"""
    if current_user['role'] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can view reviews")
    
    driver = await db.drivers.find_one({"user_id": current_user['id']})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    
    reviews = await db.driver_reviews.find({"driver_id": driver['id']}, {"_id": 0}).to_list(1000)
    
    return reviews

@api_router.post("/orders/{order_id}/review-driver")
async def review_driver(order_id: str, rating: int, comment: Optional[str] = None, current_user: Dict = Depends(get_current_user)):
    """Customer reviews driver after delivery"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can review drivers")
    
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    order = await db.orders.find_one({"id": order_id})
    if not order or order['customer_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order['status'] != OrderStatus.DELIVERED:
        raise HTTPException(status_code=400, detail="Can only review after delivery")
    
    if not order.get('driver_id'):
        raise HTTPException(status_code=400, detail="No driver assigned")
    
    # Create review
    review = DriverReview(
        order_id=order_id,
        driver_id=order['driver_id'],
        customer_id=current_user['id'],
        rating=rating,
        comment=comment
    )
    
    review_dict = review.model_dump()
    review_dict['created_at'] = review_dict['created_at'].isoformat()
    
    await db.driver_reviews.insert_one(review_dict)
    
    # Update driver rating
    all_reviews = await db.driver_reviews.find({"driver_id": order['driver_id']}).to_list(1000)
    avg_rating = sum(r['rating'] for r in all_reviews) / len(all_reviews)
    
    await db.drivers.update_one(
        {"id": order['driver_id']},
        {"$set": {"rating": round(avg_rating, 2)}}
    )
    
    return {"message": "Review submitted", "rating": rating}

@api_router.put("/orders/{order_id}/complete-delivery")
async def complete_delivery(order_id: str, current_user: Dict = Depends(get_current_user)):
    """Mark delivery as complete and record driver earnings"""
    if current_user['role'] != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can complete deliveries")
    
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    driver = await db.drivers.find_one({"user_id": current_user['id']})
    if not driver or order.get('driver_id') != driver['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate driver earning
    earning_amount = calculate_driver_earning(order['distance_km'], driver['state'])
    
    # Record earning
    earning = DriverEarning(
        driver_id=driver['id'],
        order_id=order_id,
        amount=earning_amount,
        distance_km=order['distance_km'],
        state=driver['state']
    )
    
    earning_dict = earning.model_dump()
    earning_dict['created_at'] = earning_dict['created_at'].isoformat()
    
    await db.driver_earnings.insert_one(earning_dict)
    
    # Update driver totals
    await db.drivers.update_one(
        {"id": driver['id']},
        {
            "$inc": {
                "total_earnings": earning_amount,
                "total_deliveries": 1
            }
        }
    )
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": OrderStatus.DELIVERED, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": "Delivery completed",
        "earning": earning_amount,
        "status": OrderStatus.DELIVERED
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
