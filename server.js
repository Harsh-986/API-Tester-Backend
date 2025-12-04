const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://api-tester-frontend-nine.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory storage (replace with database in production)
let users = [];
let collections = [];
let history = [];

// Routes

// Auth Routes
app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const user = {
    id: Date.now(),
    email,
    password, // In production, hash this with bcrypt!
    createdAt: new Date()
  };
  
  users.push(user);
  res.json({ 
    message: 'User registered successfully',
    user: { id: user.id, email: user.email }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  res.json({ 
    message: 'Login successful',
    user: { id: user.id, email: user.email }
  });
});

// Collection Routes
app.get('/api/collections/:userId', (req, res) => {
  const userCollections = collections.filter(c => c.userId === parseInt(req.params.userId));
  res.json(userCollections);
});

app.post('/api/collections', (req, res) => {
  const { userId, name } = req.body;
  
  const collection = {
    id: Date.now(),
    userId,
    name,
    requests: [],
    createdAt: new Date()
  };
  
  collections.push(collection);
  res.json(collection);
});

app.post('/api/collections/:collectionId/requests', (req, res) => {
  const { collectionId } = req.params;
  const { url, method, headers, params, body, name } = req.body;
  
  const collection = collections.find(c => c.id === parseInt(collectionId));
  if (!collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  
  const request = {
    id: Date.now(),
    url,
    method,
    headers,
    params,
    body,
    name,
    createdAt: new Date()
  };
  
  collection.requests.push(request);
  res.json(request);
});

app.delete('/api/collections/:collectionId', (req, res) => {
  const { collectionId } = req.params;
  collections = collections.filter(c => c.id !== parseInt(collectionId));
  res.json({ message: 'Collection deleted' });
});

// History Routes
app.get('/api/history/:userId', (req, res) => {
  const userHistory = history.filter(h => h.userId === parseInt(req.params.userId));
  res.json(userHistory);
});

app.post('/api/history', (req, res) => {
  const { userId, url, method, headers, params, body, response } = req.body;
  
  const historyItem = {
    id: Date.now(),
    userId,
    url,
    method,
    headers,
    params,
    body,
    response,
    timestamp: new Date()
  };
  
  history.push(historyItem);
  
  // Keep only last 50 items per user
  const userHistory = history.filter(h => h.userId === userId);
  if (userHistory.length > 50) {
    const oldestId = userHistory[0].id;
    history = history.filter(h => h.id !== oldestId);
  }
  
  res.json(historyItem);
});

// Proxy Route (to avoid CORS issues)
app.post('/api/proxy', async (req, res) => {
  const { url, method, headers, body } = req.body;
  
  try {
    const fetch = (await import('node-fetch')).default;
    const options = { method, headers };
    
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.text();
    
    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      body: data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get("/", (req, res) => {
  res.send("Backend is running...");
});


app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});