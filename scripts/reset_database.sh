#!/bin/bash
# Healer Database Reset Script
# Run this to clear all data and start fresh

echo "========================================="
echo "  Healer Database Reset Tool"
echo "========================================="
echo ""
echo "⚠️  WARNING: This will delete ALL data!"
echo "   - All user accounts"
echo "   - All pharmacies"
echo "   - All medicines"
echo "   - All orders"
echo "   - All drivers"
echo "   - Everything!"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Reset cancelled."
    exit 0
fi

echo ""
echo "🔄 Resetting database..."

mongosh --quiet healer_db --eval "
db.users.deleteMany({});
db.pharmacies.deleteMany({});
db.medicines.deleteMany({});
db.orders.deleteMany({});
db.drivers.deleteMany({});
db.driver_earnings.deleteMany({});
db.driver_reviews.deleteMany({});
db.password_resets.deleteMany({});
db.saved_addresses.deleteMany({});
db.saved_payment_methods.deleteMany({});
db.sessions.deleteMany({});

var usersCount = db.users.countDocuments();
var pharmaciesCount = db.pharmacies.countDocuments();
var medicinesCount = db.medicines.countDocuments();
var ordersCount = db.orders.countDocuments();

print('');
print('✅ Database reset complete!');
print('');
print('📊 Current Status:');
print('   Users: ' + usersCount);
print('   Pharmacies: ' + pharmaciesCount);
print('   Medicines: ' + medicinesCount);
print('   Orders: ' + ordersCount);
print('');
print('✨ You can now register with any email again!');
"

echo ""
echo "========================================="
echo "  Reset Complete!"
echo "========================================="
