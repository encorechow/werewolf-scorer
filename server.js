const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Load or init config (password)
function getConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ password: 'werewolf666' }, null, 2));
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

// Session store: token -> expiry timestamp
const sessions = {};
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions[token] = Date.now() + SESSION_MAX_AGE;
  return token;
}

function isValidSession(token) {
  if (!token || !sessions[token]) return false;
  if (Date.now() > sessions[token]) {
    delete sessions[token];
    return false;
  }
  return true;
}

app.use(express.json());

// Parse token from cookie
function getToken(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/(?:^|;\s*)ww_token=([^;]+)/);
  return match ? match[1] : null;
}

// Auth middleware - skip login route and login page
function authMiddleware(req, res, next) {
  if (req.path === '/api/login' || req.path === '/login.html') {
    return next();
  }
  const token = getToken(req);
  if (isValidSession(token)) {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return res.redirect('/login.html');
}

app.use(authMiddleware);
app.use(express.static(__dirname));

// Login
app.post('/api/login', (req, res) => {
  const config = getConfig();
  if (req.body.password === config.password) {
    const token = createSession();
    res.setHeader('Set-Cookie', `ww_token=${token}; Path=/; HttpOnly; Max-Age=${SESSION_MAX_AGE / 1000}; SameSite=Lax`);
    res.json({ ok: true });
  } else {
    res.status(403).json({ error: 'wrong password' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  const token = getToken(req);
  if (token) delete sessions[token];
  res.setHeader('Set-Cookie', 'ww_token=; Path=/; HttpOnly; Max-Age=0');
  res.json({ ok: true });
});

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    return { players: [], games: [] };
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Get all data
app.get('/api/data', (req, res) => {
  res.json(readData());
});

// Update players
app.put('/api/players', (req, res) => {
  const data = readData();
  data.players = req.body.players;
  writeData(data);
  res.json({ ok: true });
});

// Add a game
app.post('/api/games', (req, res) => {
  const data = readData();
  data.games.push(req.body.game);
  writeData(data);
  res.json({ ok: true, total: data.games.length });
});

// Delete a game
app.delete('/api/games/:idx', (req, res) => {
  const data = readData();
  const idx = parseInt(req.params.idx);
  if (idx >= 0 && idx < data.games.length) {
    data.games.splice(idx, 1);
    writeData(data);
    res.json({ ok: true });
  } else {
    res.status(404).json({ error: 'not found' });
  }
});

app.listen(PORT, () => {
  console.log(`狼人杀积分系统运行在 http://localhost:${PORT}`);
});
