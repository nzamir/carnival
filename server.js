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

  // 🔒 Validate input structure
  if (
    typeof climber !== 'string' ||
    typeof route !== 'string' ||
    !Array.isArray(attempts) ||
    attempts.length === 0 ||
    attempts.some(a => typeof a.zone !== 'boolean' || typeof a.top !== 'boolean')
  ) {
    return res.status(400).send('Missing or invalid fields');
  }

  // 🧠 Validate logical flow: no top before zone
  let zoneAchieved = false;
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    if (a.top && !a.zone && !zoneAchieved) {
      return res.status(400).send(`Top before zone is invalid on attempt ${i + 1}`);
    }
    if (a.zone) zoneAchieved = true;
  }

  const resultPath = path.join(__dirname, 'result.csv');

  // 📄 Ensure CSV file exists
  if (!fs.existsSync(resultPath)) {
    fs.writeFileSync(resultPath, 'Timestamp,Climber,Route,TotalAttempts,HasZone,HasTop,ZoneOnAttempt,TopOnAttempt\n');
  }

  // 🔍 Check for duplicate submission
  try {
    const existing = csvParse.parse(fs.readFileSync(resultPath, 'utf8'), { columns: true });
    if (existing.find(r => r.Climber === climber && r.Route === route)) {
      return res.status(400).send('Already submitted');
    }
  } catch (err) {
    console.error('CSV parse error:', err);
    return res.status(500).send('Error reading result file');
  }

  // ✅ Compute scoring fields
  const hasZone = attempts.some(a => a.zone);
  const hasTop = attempts.some(a => a.top);

  const zoneIndex = attempts.findIndex(a => a.zone);
  const topIndex = attempts.findIndex(a => a.top);

  const zoneOnAttempt = zoneIndex >= 0 ? zoneIndex + 1 : '';
  const topOnAttempt = topIndex >= 0 ? topIndex + 1 : '';

  const line = `${new Date().toISOString()},${climber},${route},${attempts.length},${hasZone},${hasTop},${zoneOnAttempt},${topOnAttempt}\n`;

  // 📝 Write to CSV
  fs.appendFile(resultPath, line, err => {
    if (err) {
      console.error('Error writing to result.csv:', err);
      return res.status(500).send('Server error');
    }

    io.emit('newResult', { climber, route });
    res.status(200).send('Saved');
    const category = document.getElementById('categorySelect').value;

    if (!bib || !climber || !category || !lane || isNaN(time)) {
      document.getElementById('message').textContent = 'Please fill in all fields correctly.';
      return;
    }

    const payload = {
      bib,
      climber,
      category,
      lane: laneMap[category][lane - 1], // convert index to lane name
      time
    };
   
  });
});

app.put('/submit', (req, res) => {
  const { bib, climber, lane1Time, lane2Time } = req.body;
  const resultPath = path.join(__dirname, 'result.csv');

  if (!bib || !climber || (!lane1Time && !lane2Time)) {
    return res.status(400).send('Missing required fields');
  }

  // Ensure CSV exists
  if (!fs.existsSync(resultPath)) {
    fs.writeFileSync(resultPath, 'Timestamp,Bib,Climber,Lane1Time,Lane2Time\n');
  }

  // Load existing data
  let records = [];
  try {
    records = csvParse.parse(fs.readFileSync(resultPath, 'utf8'), { columns: true });
  } catch (err) {
    console.error('CSV parse error:', err);
    return res.status(500).send('Error reading result file');
  }

  // Find existing entry
  const existing = records.find(r => r.Bib === bib);

  if (existing) {
    if (lane1Time !== undefined && existing.Lane1Time) {
      return res.status(400).send('Lane A time already submitted');
    }
    if (lane2Time !== undefined && existing.Lane2Time) {
      return res.status(400).send('Lane B time already submitted');
    }

    if (lane1Time !== undefined) existing.Lane1Time = lane1Time;
    if (lane2Time !== undefined) existing.Lane2Time = lane2Time;
  } else {
    const newEntry = {
      Timestamp: new Date().toISOString(),
      Bib: bib,
      Climber: climber,
      Lane1Time: lane1Time ?? '',
      Lane2Time: lane2Time ?? ''
    };
    records.push(newEntry);
  }

  // Write updated records
  const header = 'Timestamp,Bib,Climber,Lane1Time,Lane2Time\n';
  const lines = records.map(r =>
    `${r.Timestamp},${r.Bib},${r.Climber},${r.Lane1Time},${r.Lane2Time}`
  );
  fs.writeFileSync(resultPath, header + lines.join('\n'));

  res.status(200).send('Timing saved');
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

      let score = 0;
      let firstSuccessAttempt = 0;

      if (hasTop) {
        score = 10 + 15; // zone + top
        firstSuccessAttempt = tAttempt;
      } else if (hasZone) {
        score = 10; // zone only
        firstSuccessAttempt = zAttempt;
      }

      const penalty = firstSuccessAttempt > 1 ? (firstSuccessAttempt - 1) * 0.1 : 0;
      score -= penalty;
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

app.get('/speed-results.json', (req, res) => {
  const resultPath = path.join(__dirname, 'result.csv');
  if (!fs.existsSync(resultPath)) return res.json([]);

  try {
    const records = csvParse.parse(fs.readFileSync(resultPath, 'utf8'), { columns: true });
    const climberTimes = [];

    for (const r of records) {
      const name = r.Climber;
      const bib = r.Bib;
      const lane1 = parseFloat(r.Lane1Time);
      const lane2 = parseFloat(r.Lane2Time);

      const validTimes = [lane1, lane2].filter(t => !isNaN(t));
      if (validTimes.length === 0) continue;

      const fastest = Math.min(...validTimes);

      climberTimes.push({
        name,
        bib,
        lane1: isNaN(lane1) ? '' : lane1,
        lane2: isNaN(lane2) ? '' : lane2,
        fastest,
      });
    }

    // Sort by fastest time
    climberTimes.sort((a, b) => a.fastest - b.fastest);

    // Assign ranks
    let currentRank = 1;
    let prevTime = null;
    climberTimes.forEach((c, i) => {
      if (c.fastest === prevTime) {
        c.rank = currentRank;
      } else {
        currentRank = i + 1;
        c.rank = currentRank;
        prevTime = c.fastest;
      }
    });

    res.json(climberTimes);
  } catch (err) {
    console.error('Error reading speed results:', err);
    res.status(500).json({ error: 'Error reading results' });
  }
});



// ✅ Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));

app.get('/submitted.json', (req, res) => {
  try {
    const resultPath = path.join(__dirname, 'result.csv');
    if (!fs.existsSync(resultPath)) return res.json([]);

    const records = csvParse.parse(fs.readFileSync(resultPath, 'utf8'), { columns: true });
    const submitted = records.map(r => ({
      climber: r.Climber,
      route: r.Route
    }));

    res.json(submitted);
  } catch (err) {
    console.error('Error in /submitted.json:', err);
    res.status(500).json([]);
  }
});

app.get('/climbers/:bib', (req, res) => {
  const bib = req.params.bib.trim();
  const csvPath = path.join(__dirname, 'climbers.csv');

  try {
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const records = csvParse.parse(fileContent, { skip_empty_lines: true });

    for (const row of records) {
      const [bibNum, name] = row.map(cell => cell.trim());
      if (bibNum === bib) {
        return res.json({ name });
      }
    }

    res.status(404).json({ error: 'Climber not found' });
  } catch (err) {
    console.error('Error reading climbers.csv:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


