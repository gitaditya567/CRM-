const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { URL } = require('url');
require('dotenv').config();

const User = require('../models/User');

// Usage: node scripts/createStaffLogin.js email password
// Or set env: STAFF_EMAIL, STAFF_PASSWORD, API_URL

const email = process.argv[2] || process.env.STAFF_EMAIL || 'staff@shop.com';
const password = process.argv[3] || process.env.STAFF_PASSWORD || 'staff123';
const apiUrl = process.env.API_URL || 'http://localhost:5001/api/auth/login';

async function ensureStaff() {
  await mongoose.connect(process.env.MONGO_URI);
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('Staff already exists:', email);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ email, password: hashed, role: 'staff' });
  console.log('Staff user created:', email);
}

function loginAndSaveToken() {
  return new Promise((resolve, reject) => {
    const url = new URL(apiUrl);
    const data = JSON.stringify({ email, password });
    const lib = url.protocol === 'https:' ? require('https') : require('http');
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = lib.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          if (json.token) {
            fs.writeFileSync('token.txt', json.token, 'utf8');
            console.log('Login successful. Token saved to token.txt');
            resolve(json.token);
          } else {
            console.error('Login failed:', json);
            reject(new Error('Login failed'));
          }
        } catch (err) {
          console.error('Failed to parse response:', err, body);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  try {
    await ensureStaff();
    await loginAndSaveToken();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
