const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

let employeeData = {};

fs.createReadStream('employee.csv')
  .pipe(csv())
  .on('data', (row) => {
    employeeData[row.id] = {
      name: row.name,
      departments: row.departments.split(';'),
      tasks: row.tasks.split(';'),
    };
  });

app.get('/employee/:id', (req, res) => {
  const data = employeeData[req.params.id] || { name: '', departments: [], tasks: [] };
  res.json(data);
});

app.post('/submit', (req, res) => {
  const entry = req.body;
  entry.timestamp = new Date().toISOString();

  const filePath = path.join(__dirname, 'submissions.json');
  let submissions = [];

  if (fs.existsSync(filePath)) {
    submissions = JSON.parse(fs.readFileSync(filePath));
  }

  submissions.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
  res.json({ message: 'Submission saved!' });
});

app.get('/submissions', (req, res) => {
  const filePath = path.join(__dirname, 'submissions.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath));
    res.json(data);
  } else {
    res.json([]);
  }

  app.get('/summary', (req, res) => {
  const filePath = path.join(__dirname, 'submissions.json');
  if (!fs.existsSync(filePath)) return res.json({ Completed: 0, Attempted: 0 });

  const submissions = JSON.parse(fs.readFileSync(filePath));
  const summary = { Completed: 0, Attempted: 0 };

  submissions.forEach(entry => {
    if (entry.status === 'Completed') summary.Completed++;
    else if (entry.status === 'Attempted') summary.Attempted++;
  });

  res.json(summary);
});

});




app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
