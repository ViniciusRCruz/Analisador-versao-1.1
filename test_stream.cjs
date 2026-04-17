const https = require('https');
const options = {
  hostname: 'openrouter.ai',
  port: 443,
  path: '/api/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + process.env.VITE_OPENROUTER_API_KEY,
    'Content-Type': 'application/json'
  }
};
const req = https.request(options, (res) => {
  res.on('data', d => process.stdout.write(d));
});
req.write(JSON.stringify({
  model: 'google/gemini-3.1-pro-preview',
  messages: [{role: 'user', content: 'Say hello'}],
  stream: true,
  max_tokens: 50
}));
req.end();
