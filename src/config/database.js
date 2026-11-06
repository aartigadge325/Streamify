const mongoose = require('mongoose');
const { mongoUri } = require('./env');

mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (error) => console.error('MongoDB connection error:', error.message));

module.exports = async function connectDatabase() {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
};
