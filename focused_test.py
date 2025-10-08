#!/usr/bin/env python3
"""
Focused test for specific backend issues
"""

import requests
import json
import time

BASE_URL = "https://medrush-7.preview.emergentagent.com/api"

def test_resend_cooldown():
    """Test the resend cooldown fix"""
    print("Testing resend cooldown fix...")
    
    # First register a user
    user_data = {
        "email": "cooldown@test.com",
        "password": "TestPass@123",
        "name": "Cooldown Test",
        "role": "customer"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=user_data)
    if response.status_code == 200:
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Send first verification code
        verification_data = {"type": "email", "value": "cooldown@test.com"}
        response = requests.post(f"{BASE_URL}/verification/send-code", json=verification_data, headers=headers)
        
        if response.status_code == 200:
            print("✅ First verification code sent successfully")
            
            # Try to resend immediately (should fail with cooldown)
            response = requests.post(f"{BASE_URL}/verification/resend-code", json=verification_data, headers=headers)
            
            if response.status_code == 400:
                print("✅ Resend cooldown working correctly")
            else:
                print(f"❌ Expected 400 for cooldown, got {response.status_code}")
        else:
            print(f"❌ Failed to send first code: {response.status_code}")
    else:
        print(f"❌ Failed to register user: {response.status_code}")

def test_post_signup_verification():
    """Test post-signup verification with correct user"""
    print("\nTesting post-signup verification...")
    
    # Register pharmacy user
    pharmacy_data = {
        "email": "pharmacy.test@healer.com",
        "password": "PharmacyPass@123",
        "name": "Test Pharmacy Owner",
        "phone": "+1555987654",
        "role": "pharmacy"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register", json=pharmacy_data)
    if response.status_code == 200:
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Send post-signup verification for registered email
        verification_data = {"type": "email", "value": "pharmacy.test@healer.com"}
        response = requests.post(f"{BASE_URL}/verification/send-post-signup", json=verification_data, headers=headers)
        
        if response.status_code == 200:
            print("✅ Post-signup verification sent successfully")
            
            # Get the code and complete verification
            code = response.json().get("code")
            if code:
                verify_data = {
                    "type": "email",
                    "value": "pharmacy.test@healer.com",
                    "code": code
                }
                
                response = requests.post(f"{BASE_URL}/verification/complete-post-signup", json=verify_data, headers=headers)
                
                if response.status_code == 200:
                    print("✅ Post-signup verification completed successfully")
                else:
                    print(f"❌ Failed to complete post-signup verification: {response.status_code}")
        else:
            print(f"❌ Failed to send post-signup verification: {response.status_code}")
            print(f"Response: {response.text}")
    elif response.status_code == 400 and "already registered" in response.text:
        print("✅ Pharmacy user already exists (expected)")
    else:
        print(f"❌ Failed to register pharmacy user: {response.status_code}")

if __name__ == "__main__":
    test_resend_cooldown()
    test_post_signup_verification()