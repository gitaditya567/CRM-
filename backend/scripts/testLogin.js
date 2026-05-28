const http = require('http');

const data = JSON.stringify({ email: 'admin@shop.com', password: 'team12345' });

const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
  timeout: 5000,
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      console.log('BODY:', JSON.parse(body || '{}'));
    } catch (e) {
      console.log('BODY (raw):', body);
    }
  });
});

req.on('error', (err) => {
  console.error('REQUEST ERROR:', err.message);
});

req.on('timeout', () => {
  req.destroy(new Error('Request timed out'));
});

req.write(data);
req.end();
