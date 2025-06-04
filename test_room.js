const http = require('http');

const postData = JSON.stringify({
  name: "General Chat",
  description: "A general chat room for everyone"
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/rooms',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODQwMDgxYWIzYTUyNGYwMzEwOTZiZWUiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzQ5MDI2ODc2LCJleHAiOjE3NDk2MzE2NzZ9.TBPZDZRZ_3pRGHZf6oZIzx_YmfzsYzWY0Hd0J7d8_z8',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(`headers:`, res.headers);

  res.on('data', (d) => {
    process.stdout.write(d);
  });

  res.on('end', () => {
    console.log('\nRequest finished');
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(postData);
req.end();
