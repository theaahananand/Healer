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
    notes: Optional[str] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    pharmacy_id: str
    driver_id: Optional[str] = None
    items: List[OrderItem]
    total_amount: float
    delivery_address: Location
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

# ==================== HELPER FUNCTIONS ====================

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

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
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
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not pwd_context.verify(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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
    """Create a new order"""
    if current_user['role'] != UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Only customers can create orders")
    
    # Calculate total amount
    total_amount = sum(item.price * item.quantity for item in order_data.items)
    
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
    
    estimated_time = estimate_delivery_time(distance)
    
    order = Order(
        customer_id=current_user['id'],
        pharmacy_id=order_data.pharmacy_id,
        items=order_data.items,
        total_amount=total_amount,
        delivery_address=order_data.delivery_address,
        payment_method=order_data.payment_method,
        distance_km=distance,
        estimated_time=estimated_time,
        notes=order_data.notes
    )
    
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    
    await db.orders.insert_one(order_dict)
    
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
