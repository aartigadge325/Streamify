require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function main() {
  const username = process.argv[2]?.trim().toLowerCase();
  if (!username) throw new Error('Usage: npm run admin:promote -- <username>');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI must be set in .env');

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const user = await User.findOne({ username });
  if (!user) throw new Error(`No user found with username "${username}"`);
  if (user.role !== 'admin') {
    user.role = 'admin';
    await user.save();
  }
  console.log(`User "${username}" is now an administrator. Sign in again to receive an admin access token.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
