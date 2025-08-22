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

const routes = ["Route 1", "Route 2", "Route 3", "Route 4", "Route 5", "Route 6"];

// ✅ Serve climbers and routes
app.get('/data', (req, res) => {
  try {
    const csvPath = path.join(__dirname, 'climbers.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = csvParse.parse(fileContent, { skip_empty_lines: true });
    const climbers = records.map(row => row[0].trim());
    res.json({ climbers, routes });
  } catch (err) {
    console.error(err);
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
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];

    if (a.zone) zoneAchieved = true;

    if (a.top && !a.zone && !zoneAchieved) {
      return res.status(400).send(`Invalid attempt sequence: Top achieved on attempt ${a.number} before any zone was recorded.`);
    }
  }

  const resultPath = path.join(__dirname, 'result.csv');

  if (fs.existsSync(resultPath)) {
    const fileContent = fs.readFileSync(resultPath, 'utf8');
    const records = csvParse.parse(fileContent, { columns: true, skip_empty_lines: true });

    const alreadySubmitted = records.find(r =>
      r.Climber === climber && r.Route === route
    );

    if (alreadySubmitted) {
      return res.status(400).json({ error: 'Result already submitted for this climber and route.' });
    }
  } else {
    fs.writeFileSync(resultPath, 'Timestamp,Climber,Route,TotalAttempts,HasZone,HasTop,ZoneOnAttempt,TopOnAttempt\n');
  }

  const totalAttempts = attempts.length;
  const hasZone = attempts.some(a => a.zone);
  const hasTop = attempts.some(a => a.top);
  const zoneOnAttempt = attempts.findIndex(a => a.zone) + 1 || '';
  const topOnAttempt = attempts.findIndex(a => a.top) + 1 || '';

  const line = `${new Date().toISOString()},${climber},${route},${totalAttempts},${hasZone},${hasTop},${zoneOnAttempt},${topOnAttempt}\n`;
  fs.appendFile(resultPath, line, (err) => {
    if (err) {
      console.error('Error writing result.csv', err);
      return res.status(500).send('Server error');
    }

    io.emit('newResult', {
      climber,
      route,
      totalAttempts,
      hasZone,
      hasTop,
      zoneOnAttempt,
      topOnAttempt,
      attempts
    });

    res.status(200).send('Saved');
  });
});

// ✅ Serve full results
app.get('/results.json', (req, res) => {
  try {
    const resultPath = path.join(__dirname, 'result.csv');

    // ✅ Check if file exists first
    if (!fs.existsSync(resultPath)) {
      return res.json({});
    }

    const fileContent = fs.readFileSync(resultPath, 'utf8');
    const records = csvParse.parse(fileContent, { columns: true, skip_empty_lines: true });

    // ✅ Your aggregation logic here...
    const climberStats = {};
    const seenRoutes = new Set();

    records.forEach(r => {
      const name = r.Climber;
      const route = r.Route;
      const key = `${name}-${route}`;
      if (seenRoutes.has(key)) return;
      seenRoutes.add(key);

      if (!climberStats[name]) {
        climberStats[name] = {
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
      const zoneAttempt = parseInt(r.ZoneOnAttempt || 0, 10);
      const topAttempt = parseInt(r.TopOnAttempt || 0, 10);

      if (r.HasZone === 'true') {
        stats.zoneCount += 1;
        stats.attemptsToZone += zoneAttempt;
      }

      if (r.HasTop === 'true') {
        stats.topCount += 1;
        stats.attemptsToTop += topAttempt;
        stats.routeStatus[route] = 'top';
      } else if (r.HasZone === 'true') {
        stats.routeStatus[route] = 'zone';
      } else {
        stats.routeStatus[route] = 'none';
      }

      stats.routeAttempts[route] = {
        zone: zoneAttempt || '',
        top: topAttempt || ''
      };

      // ✅ Score calculation
      const zoneAttempt = parseInt(r.ZoneOnAttempt, 10);
      const topAttempt = parseInt(r.TopOnAttempt, 10);

      const zonePenalty = Number.isInteger(zoneAttempt) ? Math.max(0, zoneAttempt - 1) * 0.1 : 0;
      const topPenalty = Number.isInteger(topAttempt) ? Math.max(0, topAttempt - 1) * 0.1 : 0;

      const score =
        (r.HasZone === 'true' ? 10 - zonePenalty : 0) +
        (r.HasTop === 'true' ? 15 - topPenalty : 0);

      stats.score += parseFloat(score.toFixed(2));

    });

    res.json(climberStats);
  } catch (err) {
    console.error('Error reading result.csv:', err.message);
    res.status(500).json({ error: 'Error reading result.csv', details: err.message });
  }
});



// ✅ Serve summary of submissions
app.get('/summary.json', (req, res) => {
  try {
    const resultPath = path.join(__dirname, 'result.csv');
    if (!fs.existsSync(resultPath)) return res.json([]);

    const fileContent = fs.readFileSync(resultPath, 'utf8');
    const records = csvParse.parse(fileContent, { columns: true, skip_empty_lines: true });

    const summary = {};
    records.forEach(record => {
      const climber = record.Climber;
      const route = record.Route;
      if (!summary[climber]) summary[climber] = [];
      summary[climber].push(route);
    });

    const summaryArray = Object.entries(summary).map(([climber, routes]) => ({
      climber,
      routes,
      count: routes.length
    }));

    res.json(summaryArray);
  } catch (err) {
    console.error('Error generating summary:', err);
    res.status(500).json({ error: 'Error generating summary' });
  }
});

// ✅ Serve submitted climber-route pairs
app.get('/submitted.json', (req, res) => {
  try {
    const resultPath = path.join(__dirname, 'result.csv');
    if (!fs.existsSync(resultPath)) return res.json([]);

    const fileContent = fs.readFileSync(resultPath, 'utf8');
    const records = csvParse.parse(fileContent, { columns: true, skip_empty_lines: true });

    const submitted = records.map(r => ({
      climber: r.Climber,
      route: r.Route
    }));

    res.json(submitted);
  } catch (err) {
    console.error('Error reading submitted results:', err);
    res.status(500).json({ error: 'Error reading submitted results' });
  }
});

// ✅ Handle client connections
io.on('connection', socket => {
  console.log('Client connected');
});

// ✅ Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});

// ✅ Handle climber CSV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, __dirname),
  filename: (req, file, cb) => cb(null, 'climbers.csv')
});

const upload = multer({ storage });

app.post('/upload-climbers', upload.single('csvFile'), (req, res) => {
  const climbers = [];

  fs.createReadStream(path.join(__dirname, 'climbers.csv'))
    .pipe(require('csv-parser')())
    .on('data', row => climbers.push(row))
    .on('end', () => {
      console.log(`Climber list updated via upload. ${climbers.length} climbers loaded.`);
      res.send(`Climber list updated and reloaded! ${climbers.length} climbers loaded.`);
    })
    .on('error', err => {
      console.error('Error reading uploaded climbers.csv:', err);
      res.status(500).send('Failed to reload climber list.');
    });
});

function renderBar(status, zoneAttempt, topAttempt) {
  const zoneText = zoneAttempt ? zoneAttempt : '';
  const topText = topAttempt ? topAttempt : '';
  const innerHTML = `<div>${topText}</div><div>${zoneText}</div>`;

  if (status === 'top') return `<span class="bar full" data-label="${zoneText}AZ${topText}AT">${innerHTML}</span>`;
  if (status === 'zone') return `<span class="bar half" data-label="${zoneText}AZ0AT">${innerHTML}</span>`;
  return `<span class="bar empty" data-label="No score"><div></div><div></div></span>`;
}


function calculateScore(zoneAttempt, topAttempt) {
  let score = 0;

  if (zoneAttempt) {
    const zonePenalty = Math.max(0, zoneAttempt - 1) * 0.1;
    score += 10 - zonePenalty;
  }

  if (topAttempt) {
    const topPenalty = Math.max(0, topAttempt - 1) * 0.1;
    score += 15 - topPenalty;
  }

  return parseFloat(score.toFixed(2));
}

