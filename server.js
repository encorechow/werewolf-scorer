const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(__dirname));

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
