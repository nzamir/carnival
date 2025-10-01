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
  const { employeeId, task, status } = req.body;

  const existing = submissions.find(
    s => s.employeeId === employeeId && s.task === task
  );

  // 🔒 Prevent duplicate "Completed" submissions
  if (existing && existing.status === 'Completed') {
    return res.status(400).json({
      message: 'Task already marked as Completed. Cannot resubmit.',
    });
  }

  // 🔒 Prevent downgrading from Completed → Attempted
  if (existing && existing.status === 'Attempted' && status === 'Attempted') {
    return res.status(400).json({
      message: 'Task already attempted. You must mark it as Completed.',
    });
  }

  // ✅ Save or update the submission
  if (existing) {
    existing.status = status;
  } else {
    submissions.push(req.body);
  }

  res.json({ message: 'Submission recorded successfully.' });
});


app.get('/submissions', (req, res) => {
  const filePath = path.join(__dirname, 'submissions.json');
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath));
    res.json(data);
  } else {
    res.json([]);
  }
});

app.get('/summary-by-employee', (req, res) => {
  const filePath = path.join(__dirname, 'submissions.json');
  if (!fs.existsSync(filePath)) return res.json([]);

  const submissions = JSON.parse(fs.readFileSync(filePath));
  const summaryMap = {};

  submissions.forEach(entry => {
    const id = entry.employeeId;
    if (!summaryMap[id]) {
      summaryMap[id] = {
        employeeId: id,
        employeeName: entry.employeeName,
        Completed: 0,
        Attempted: 0,
      };
    }
    if (entry.status === 'Completed') summaryMap[id].Completed++;
    else if (entry.status === 'Attempted') summaryMap[id].Attempted++;
  });

  const summaryList = Object.values(summaryMap);
  res.json(summaryList);
});

function getTaskStatus(employeeId, task) {
  const entry = submissions.find(s => s.employeeId === employeeId && s.task === task);
  return entry ? entry.status : null;
}

function saveSubmission(data) {
  const index = submissions.findIndex(s => s.employeeId === data.employeeId && s.task === data.task);
  if (index !== -1) {
    submissions[index].status = data.status;
  } else {
    submissions.push(data);
  }
}



app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
