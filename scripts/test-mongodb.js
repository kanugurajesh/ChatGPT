// Test script for MongoDB integration - simplified ES module version
const mongoose = require('mongoose');

// Simple MongoDB connection test
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://rajesh:5Oa9Fq6mfKtEScaB@cluster0.adwbjsb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testMongoDB() {
  console.log('🌿 Starting MongoDB connection test...');
  console.log('🔗 MongoDB URI:', MONGODB_URI.replace(/\/\/[^@]+@/, '//<credentials>@'));
  
  try {
    // Test 1: Database connection
    console.log('🔄 Attempting database connection...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Database connection successful!');

    // Test 2: Basic collection operations
    console.log('📋 Testing basic collection operations...');
    const testCollection = mongoose.connection.db.collection('test-connection');
    
    // Insert test document
    const testDoc = { message: 'Test MongoDB connection', timestamp: new Date() };
    console.log('➕ Inserting test document:', testDoc);
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('✅ Document inserted with ID:', insertResult.insertedId);

    // Read test document
    console.log('🔍 Reading test document...');
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('✅ Document found:', foundDoc);

    // Clean up test document
    console.log('🧽 Cleaning up test document...');
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test document deleted successfully');
    
    console.log('🎆 All MongoDB tests passed!');

    
  } catch (error) {
    console.error('❌ MongoDB test failed!');
    console.error('💥 Error details:', error.message);
    
    if (error.message.includes('Authentication failed')) {
      console.error('🔐 Authentication error: Please check your MongoDB credentials');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('🌍 Network error: Cannot reach MongoDB server');
    } else if (error.message.includes('MongoNetworkError')) {
      console.error('🚫 Network error: MongoDB connection failed');
    }
    
    console.error('🚨 Exiting with error code 1');
    process.exit(1);
  } finally {
    // Close database connection
    console.log('🔌 Closing database connection...');
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('✅ Database disconnected successfully');
    }
    console.log('🏁 Script execution completed');
    process.exit(0);
  }
}

// Run the test
console.log('🧪 Running MongoDB Test Script');
console.log('='.repeat(50));
testMongoDB().catch(error => {
  console.error('💥 Script execution failed:', error);
  process.exit(1);
});