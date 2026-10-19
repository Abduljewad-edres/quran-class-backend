require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const User     = require('../src/models/User');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quranclass');
  console.log('Connected to MongoDB');

  const exists = await User.findOne({ username: 'admin' });
  if (exists) {
    console.log('Admin already exists — skipping seed');
    process.exit(0);
  }

  const hash = await bcrypt.hash('Admin@1234', 12);
  await User.create({
    fullName:      'System Administrator',
    username:      'admin',
    email:         'admin@quranclass.local',
    passwordHash:  hash,
    role:          'admin',
    status:        'active',
    mustChangePwd: false,
  });

  console.log('✅  Admin seeded — username: admin, password: Admin@1234');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
