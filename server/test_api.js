const http = require('http');

const data = JSON.stringify({
  newMarks: 5,
  reason: "Testing override save fix"
});

// We need an attempt ID, so let's just make a generic request and see if it hits the 404 Attempt Not Found or a 400 Validation Error first
const req = http.request({
  hostname: 'localhost',
  port: 8000,
  path: '/api/v1/super-admin/results/invalid-id/override-marks',
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, (res) => {
  let responseBody = '';
  res.on('data', (chunk) => responseBody += chunk);
  res.on('end', () => {
    console.log("Status Code:", res.statusCode);
    console.log("Response:", responseBody);
  });
});

req.on('error', (e) => {
  console.error("Error:", e.message);
});

req.write(data);
req.end();
