const express = require('express');
const fs = require('fs');
const path = require('path');
const csvParse = require('csv-parse/sync');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static(__dirname));

const routes = ["Route 1", "Route 2", "Route 3", "Route 4"];

// ✅ Serve climbers and routes
app.get('/data', (req, res) => {
  try {
    const csvPath = path.join(__dirname, 'climbers.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = csvParse.parse(fileContent, { skip_empty_lines: true });
    const climbers = records.map(row => row[0].trim());
    res.json({ climbers, routes });
  } catch (err) {
    res.status(500).json({ error: 'Error reading climbers.csv' });
  }
});

// ✅ Handle result submissions
app.post('/submit', (req, res) => {
  const { climber, route, attempts } = req.body;
  if (!climber || !route || !Array.isArray(attempts)) {
    return res.status(400).send('Missing or invalid fields');
  }

  let zoneAchieved = false;
  for (let a of attempts) {
    if (a.zone) zoneAchieved = true;
    if (a.top && !a.zone && !zoneAchieved) {
      return res.status(400).send(`Top before zone is invalid`);
    }
  }

  const resultPath = path.join(__dirname, 'result.csv');
  if (!fs.existsSync(resultPath)) {
    fs.writeFileSync(resultPath, 'Timestamp,Climber,Route,TotalAttempts,HasZone,HasTop,ZoneOnAttempt,TopOnAttempt\n');
  } else {
    const existing = csvParse.parse(fs.readFileSync(resultPath, 'utf8'), { columns: true });
    if (existing.find(r => r.Climber === climber && r.Route === route)) {
      return res.status(400).json({ error: 'Already submitted' });
    }
  }

  const hasZone = attempts.some(a => a.zone);
  const hasTop = attempts.some(a => a.top);
  const zoneOnAttempt = attempts.findIndex(a => a.zone) + 1 || '';
  const topOnAttempt = attempts.findIndex(a => a.top) + 1 || '';
  const line = `${new Date().toISOString()},${climber},${route},${attempts.length},${hasZone},${hasTop},${zoneOnAttempt},${topOnAttempt}\n`;

  fs.appendFile(resultPath, line, err => {
    if (err) return res.status(500).send('Server error');
    io.emit('newResult', { climber, route });
    res.status(200).send('Saved');
  });
});

// ✅ Serve ranked results
app.get('/results.json', (req, res) => {
  try {
    const resultPath = path.join(__dirname, 'result.csv');
    if (!fs.existsSync(resultPath)) return res.json([]);

    const records = csvParse.parse(fs.readFileSync(resultPath, 'utf8'), { columns: true });
    const climberStats = {};
    const seen = new Set();

    records.forEach(r => {
      const key = `${r.Climber}-${r.Route}`;
      if (seen.has(key)) return;
      seen.add(key);

      const name = r.Climber;
      const zAttempt = parseInt(r.ZoneOnAttempt || 0);
      const tAttempt = parseInt(r.TopOnAttempt || 0);
      const hasZone = r.HasZone === 'true';
      const hasTop = r.HasTop === 'true';

      if (!climberStats[name]) {
        climberStats[name] = {
          name,
          topCount: 0,
          zoneCount: 0,
          attemptsToTop: 0,
          attemptsToZone: 0,
          score: 0,
          routeStatus: {},
          routeAttempts: {}
        };
      }

      const stats = climberStats[name];
      if (hasZone) {
        stats.zoneCount += 1;
        stats.attemptsToZone += zAttempt;
      }
      if (hasTop) {
        stats.topCount += 1;
        stats.attemptsToTop += tAttempt;
        stats.routeStatus[r.Route] = 'top';
      } else if (hasZone) {
        stats.routeStatus[r.Route] = 'zone';
      } else {
        stats.routeStatus[r.Route] = 'none';
      }

      stats.routeAttempts[r.Route] = {
        zone: zAttempt || '',
        top: tAttempt || ''
      };

      let firstSuccess = hasTop ? tAttempt : hasZone ? zAttempt : 0;
      const penalty = firstSuccess > 1 ? (firstSuccess - 1) * 0.1 : 0;
      const score = (hasZone || hasTop) ? 25 - penalty : 0;
      stats.score += parseFloat(score.toFixed(2));
    });

    const ranked = Object.values(climberStats).sort((a, b) => b.score - a.score);
    let currentRank = 1, prevScore = null;
    ranked.forEach((c, i) => {
      if (c.score === prevScore) {
        c.rank = currentRank;
      } else {
        currentRank = i + 1;
        c.rank = currentRank;
        prevScore = c.score;
      }
    });

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Error reading results' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
