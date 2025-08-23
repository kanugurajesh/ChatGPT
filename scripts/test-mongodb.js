// Test script for MongoDB integration - simplified ES module version
const mongoose = require('mongoose');

// Simple MongoDB connection test
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rajesh:5Oa9Fq6mfKtEScaB@cluster0.adwbjsb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testMongoDB() {
  console.log('🧪 Starting MongoDB connection test...');
  
  try {
    // Test 1: Database connection
    console.log('\n1️⃣ Testing database connection...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Database connected successfully to:', MONGODB_URI.replace(/\/\/.*:.*@/, '//****:****@'));

    // Test 2: Basic collection operations
    console.log('\n2️⃣ Testing basic collection operations...');
    const testCollection = mongoose.connection.db.collection('test-connection');
    
    // Insert test document
    const testDoc = { message: 'Test MongoDB connection', timestamp: new Date() };
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Test document inserted:', insertResult.insertedId);

    // Read test document
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Test document retrieved:', foundDoc.message);

    // Clean up test document
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test document cleaned up');

    console.log('\n🎉 MongoDB connection test passed! Your database is ready to use.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('💡 Check your MongoDB credentials in .env.local');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('💡 Check your internet connection and MongoDB cluster URL');
    } else if (error.message.includes('MongoNetworkError')) {
      console.error('💡 Check if your IP address is whitelisted in MongoDB Atlas');
    }
    
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Database connection closed');
    }
    process.exit(0);
  }
}

// Run the test
testMongoDB();