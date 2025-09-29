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
  const filePath = path.join(__dirname, 'submissions.json');
  let submissions = [];

  if (fs.existsSync(filePath)) {
    submissions = JSON.parse(fs.readFileSync(filePath));
  }

  submissions.push(entry);
  fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
  res.json({ message: 'Submission saved!' });
});

alert(result.message);
document.getElementById('task-form').reset();

// Optional: Clear radio buttons manually if needed
const radios = document.querySelectorAll('input[name="task"]');
radios.forEach(r => r.checked = false);

// Optional: Clear dynamic task options
document.getElementById('task-options').innerHTML = '';

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
