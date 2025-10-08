#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Healer Pharmacy App
Tests Google OAuth, Profile Management, and Verification System
"""

import requests
import json
import time
import base64
from typing import Dict, Optional
import os

# Configuration
BASE_URL = "https://medrush-7.preview.emergentagent.com/api"
TEST_USER_EMAIL = "testuser@healerapp.com"
TEST_USER_PASSWORD = "TestPass@123"
TEST_USER_NAME = "John Doe"
TEST_USER_PHONE = "+1234567890"

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, message: str, details: str = ""):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: dict = None, files: dict = None, headers: dict = None) -> tuple:
        """Make HTTP request and return response and success status"""
        url = f"{self.base_url}{endpoint}"
        
        # Add auth header if token exists
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                if files:
                    response = self.session.post(url, data=data, files=files, headers=headers)
                else:
                    response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                return None, False, "Unsupported HTTP method"
            
            return response, True, ""
        except Exception as e:
            return None, False, str(e)
    
    def setup_test_user(self) -> bool:
        """Create and authenticate test user"""
        print("\n=== Setting up test user ===")
        
        # Try to register a new user
        user_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME,
            "phone": TEST_USER_PHONE,
            "role": "customer"
        }
        
        response, success, error = self.make_request("POST", "/auth/register", user_data)
        
        if success and response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("token")
            self.user_id = data.get("user", {}).get("id")
            self.log_test("User Registration", True, "Test user registered successfully")
            return True
        elif success and response.status_code == 400 and "already registered" in response.text:
            # User exists, try to login
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            response, success, error = self.make_request("POST", "/auth/login", login_data)
            
            if success and response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("token")
                self.user_id = data.get("user", {}).get("id")
                self.log_test("User Login", True, "Test user logged in successfully")
                return True
            else:
                self.log_test("User Login", False, "Failed to login test user", 
                            f"Status: {response.status_code if response else 'No response'}, Error: {error}")
                return False
        else:
            self.log_test("User Registration", False, "Failed to register test user", 
                        f"Status: {response.status_code if response else 'No response'}, Error: {error}")
            return False
    
    def test_google_oauth_session(self):
        """Test Google OAuth session endpoint"""
        print("\n=== Testing Google OAuth Integration ===")
        
        # Test without X-Session-ID header
        response, success, error = self.make_request("POST", "/auth/google-session", headers={})
        
        if success:
            if response.status_code == 422:  # Missing header
                self.log_test("Google OAuth - Missing Header", True, "Correctly requires X-Session-ID header")
            else:
                self.log_test("Google OAuth - Missing Header", False, 
                            f"Expected 422 for missing header, got {response.status_code}")
        else:
            self.log_test("Google OAuth - Missing Header", False, "Request failed", error)
        
        # Test with invalid session ID
        headers = {"X-Session-ID": "invalid-session-id"}
        response, success, error = self.make_request("POST", "/auth/google-session", headers=headers)
        
        if success:
            if response.status_code == 401:  # Invalid session
                self.log_test("Google OAuth - Invalid Session", True, "Correctly rejects invalid session ID")
            else:
                self.log_test("Google OAuth - Invalid Session", False, 
                            f"Expected 401 for invalid session, got {response.status_code}")
        else:
            self.log_test("Google OAuth - Invalid Session", False, "Request failed", error)
    
    def test_profile_management(self):
        """Test profile management endpoints"""
        print("\n=== Testing Profile Management ===")
        
        if not self.auth_token:
            self.log_test("Profile Management", False, "No auth token available")
            return
        
        # Test GET profile
        response, success, error = self.make_request("GET", "/profile")
        
        if success and response.status_code == 200:
            profile_data = response.json()
            self.log_test("Get Profile", True, "Successfully retrieved user profile")
            
            # Test PUT profile (name only - no verification required)
            update_data = {"name": "John Updated Doe"}
            response, success, error = self.make_request("PUT", "/profile", update_data)
            
            if success and response.status_code == 200:
                self.log_test("Update Profile Name", True, "Successfully updated profile name")
            else:
                self.log_test("Update Profile Name", False, 
                            f"Failed to update profile name: {response.status_code if response else 'No response'}")
            
            # Test PUT profile with email change (should require verification)
            update_data = {"email": "newemail@healerapp.com"}
            response, success, error = self.make_request("PUT", "/profile", update_data)
            
            if success and response.status_code == 400:
                self.log_test("Update Profile Email", True, "Correctly requires email verification")
            else:
                self.log_test("Update Profile Email", False, 
                            f"Expected 400 for unverified email, got {response.status_code if response else 'No response'}")
            
            # Test PUT profile with phone change (should require verification)
            update_data = {"phone": "+9876543210"}
            response, success, error = self.make_request("PUT", "/profile", update_data)
            
            if success and response.status_code == 400:
                self.log_test("Update Profile Phone", True, "Correctly requires phone verification")
            else:
                self.log_test("Update Profile Phone", False, 
                            f"Expected 400 for unverified phone, got {response.status_code if response else 'No response'}")
        else:
            self.log_test("Get Profile", False, 
                        f"Failed to get profile: {response.status_code if response else 'No response'}")
    
    def test_profile_picture_upload(self):
        """Test profile picture upload"""
        print("\n=== Testing Profile Picture Upload ===")
        
        if not self.auth_token:
            self.log_test("Profile Picture Upload", False, "No auth token available")
            return
        
        # Create a small test image (1x1 pixel PNG)
        test_image_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8qAAAAAElFTkSuQmCC"
        )
        
        # Test with valid image
        files = {"file": ("test.png", test_image_data, "image/png")}
        response, success, error = self.make_request("POST", "/profile/upload-picture", files=files)
        
        if success and response.status_code == 200:
            self.log_test("Profile Picture Upload", True, "Successfully uploaded profile picture")
        else:
            self.log_test("Profile Picture Upload", False, 
                        f"Failed to upload picture: {response.status_code if response else 'No response'}")
        
        # Test with non-image file
        files = {"file": ("test.txt", b"This is not an image", "text/plain")}
        response, success, error = self.make_request("POST", "/profile/upload-picture", files=files)
        
        if success and response.status_code == 400:
            self.log_test("Profile Picture - Invalid File Type", True, "Correctly rejects non-image files")
        else:
            self.log_test("Profile Picture - Invalid File Type", False, 
                        f"Expected 400 for non-image, got {response.status_code if response else 'No response'}")
    
    def test_verification_system(self):
        """Test comprehensive verification system"""
        print("\n=== Testing Verification System ===")
        
        if not self.auth_token:
            self.log_test("Verification System", False, "No auth token available")
            return
        
        # Test send verification code for email
        verification_data = {
            "type": "email",
            "value": "verify@healerapp.com"
        }
        
        response, success, error = self.make_request("POST", "/verification/send-code", verification_data)
        
        if success and response.status_code == 200:
            data = response.json()
            verification_code = data.get("code")  # In development, code is returned
            self.log_test("Send Email Verification", True, "Successfully sent email verification code")
            
            if verification_code:
                # Test verify code
                verify_data = {
                    "type": "email",
                    "value": "verify@healerapp.com",
                    "code": verification_code
                }
                
                response, success, error = self.make_request("POST", "/verification/verify-code", verify_data)
                
                if success and response.status_code == 200:
                    self.log_test("Verify Email Code", True, "Successfully verified email code")
                else:
                    self.log_test("Verify Email Code", False, 
                                f"Failed to verify code: {response.status_code if response else 'No response'}")
                
                # Test verify with wrong code
                verify_data["code"] = "000000"
                response, success, error = self.make_request("POST", "/verification/verify-code", verify_data)
                
                if success and response.status_code == 400:
                    self.log_test("Verify Wrong Code", True, "Correctly rejects wrong verification code")
                else:
                    self.log_test("Verify Wrong Code", False, 
                                f"Expected 400 for wrong code, got {response.status_code if response else 'No response'}")
        else:
            self.log_test("Send Email Verification", False, 
                        f"Failed to send verification: {response.status_code if response else 'No response'}")
        
        # Test send verification code for phone
        verification_data = {
            "type": "phone",
            "value": "+1987654321"
        }
        
        response, success, error = self.make_request("POST", "/verification/send-code", verification_data)
        
        if success and response.status_code == 200:
            self.log_test("Send Phone Verification", True, "Successfully sent phone verification code")
        else:
            self.log_test("Send Phone Verification", False, 
                        f"Failed to send phone verification: {response.status_code if response else 'No response'}")
        
        # Test resend functionality with 30-second cooldown
        response, success, error = self.make_request("POST", "/verification/resend-code", verification_data)
        
        if success and response.status_code == 400:
            self.log_test("Resend Cooldown", True, "Correctly enforces 30-second resend cooldown")
        elif success and response.status_code == 200:
            self.log_test("Resend Code", True, "Successfully resent verification code")
        else:
            self.log_test("Resend Code", False, 
                        f"Unexpected response: {response.status_code if response else 'No response'}")
        
        # Test invalid verification type
        invalid_data = {
            "type": "invalid",
            "value": "test@example.com"
        }
        
        response, success, error = self.make_request("POST", "/verification/send-code", invalid_data)
        
        if success and response.status_code == 400:
            self.log_test("Invalid Verification Type", True, "Correctly rejects invalid verification type")
        else:
            self.log_test("Invalid Verification Type", False, 
                        f"Expected 400 for invalid type, got {response.status_code if response else 'No response'}")
    
    def test_post_signup_verification(self):
        """Test post-signup verification for pharmacy/driver accounts"""
        print("\n=== Testing Post-Signup Verification ===")
        
        # Create pharmacy user for testing
        pharmacy_data = {
            "email": "pharmacy@healerapp.com",
            "password": "PharmacyPass@123",
            "name": "Test Pharmacy",
            "phone": "+1555123456",
            "role": "pharmacy"
        }
        
        response, success, error = self.make_request("POST", "/auth/register", pharmacy_data)
        
        if success and response.status_code == 200:
            data = response.json()
            pharmacy_token = data.get("token")
            
            # Test post-signup verification
            verification_data = {
                "type": "email",
                "value": "pharmacy@healerapp.com"
            }
            
            headers = {"Authorization": f"Bearer {pharmacy_token}"}
            response, success, error = self.make_request("POST", "/verification/send-post-signup", 
                                                       verification_data, headers=headers)
            
            if success and response.status_code == 200:
                data = response.json()
                verification_code = data.get("code")
                self.log_test("Post-Signup Send Code", True, "Successfully sent post-signup verification code")
                
                if verification_code:
                    # Test complete post-signup verification
                    verify_data = {
                        "type": "email",
                        "value": "pharmacy@healerapp.com",
                        "code": verification_code
                    }
                    
                    response, success, error = self.make_request("POST", "/verification/complete-post-signup", 
                                                               verify_data, headers=headers)
                    
                    if success and response.status_code == 200:
                        self.log_test("Complete Post-Signup", True, "Successfully completed post-signup verification")
                    else:
                        self.log_test("Complete Post-Signup", False, 
                                    f"Failed to complete verification: {response.status_code if response else 'No response'}")
            else:
                self.log_test("Post-Signup Send Code", False, 
                            f"Failed to send post-signup code: {response.status_code if response else 'No response'}")
        elif success and response.status_code == 400 and "already registered" in response.text:
            self.log_test("Post-Signup Verification", True, "Pharmacy user already exists (expected)")
        else:
            self.log_test("Post-Signup Verification Setup", False, 
                        f"Failed to create pharmacy user: {response.status_code if response else 'No response'}")
    
    def test_authentication_endpoints(self):
        """Test basic authentication endpoints"""
        print("\n=== Testing Authentication Endpoints ===")
        
        if not self.auth_token:
            self.log_test("Authentication Test", False, "No auth token available")
            return
        
        # Test /auth/me endpoint
        response, success, error = self.make_request("GET", "/auth/me")
        
        if success and response.status_code == 200:
            user_data = response.json()
            if user_data.get("email") == TEST_USER_EMAIL:
                self.log_test("Get Current User", True, "Successfully retrieved current user data")
            else:
                self.log_test("Get Current User", False, "User data mismatch")
        else:
            self.log_test("Get Current User", False, 
                        f"Failed to get current user: {response.status_code if response else 'No response'}")
        
        # Test logout
        response, success, error = self.make_request("POST", "/auth/logout")
        
        if success and response.status_code == 200:
            self.log_test("User Logout", True, "Successfully logged out user")
        else:
            self.log_test("User Logout", False, 
                        f"Failed to logout: {response.status_code if response else 'No response'}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Healer Backend API Tests")
        print("=" * 50)
        
        # Setup test user
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Aborting tests.")
            return
        
        # Run all test suites
        self.test_google_oauth_session()
        self.test_profile_management()
        self.test_profile_picture_upload()
        self.test_verification_system()
        self.test_post_signup_verification()
        self.test_authentication_endpoints()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("🏁 TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()