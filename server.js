const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

const employeeData = {};
const submissionsPath = path.join(__dirname, 'submissions.json');
let submissions = [];

// 🔄 Load employee data
const adhocPath = path.join(__dirname, 'adhoc-employees.json');

// Load CSV
function preloadEmployeeCSV() {
  return new Promise((resolve) => {
    fs.createReadStream('employee.csv')
      .pipe(csv())
      .on('data', (row) => {
        employeeData[row.id] = {
          name: row.name,
          departments: row.departments.split(';'),
          tasks: row.tasks.split(';'),
        };
      })
      .on('end', resolve);
  });
}

// Load adhoc additions
function preloadAdhocEmployees() {
  if (fs.existsSync(adhocPath)) {
    const adhoc = JSON.parse(fs.readFileSync(adhocPath));
    Object.entries(adhoc).forEach(([id, emp]) => {
      employeeData[id] = emp; // overwrite or add
    });
  }
}

app.post('/add-employee', (req, res) => {
  const { id, name, departments, tasks } = req.body;

  if (employeeData[id]) {
    return res.status(400).json({ message: 'Employee ID already exists.' });
  }

  const newEmp = { name, departments, tasks };
  employeeData[id] = newEmp;

  // Save to adhoc file
  let adhoc = {};
  if (fs.existsSync(adhocPath)) {
    adhoc = JSON.parse(fs.readFileSync(adhocPath));
  }
  adhoc[id] = newEmp;
  fs.writeFileSync(adhocPath, JSON.stringify(adhoc, null, 2));

  res.json({ message: 'Employee added successfully.' });
});


// Combine both
async function preloadAllEmployees() {
  await preloadEmployeeCSV();
  preloadAdhocEmployees();
  console.log('✅ Employee data loaded from CSV + adhoc');
}

preloadAllEmployees();


// 🔄 Load submissions
if (fs.existsSync(submissionsPath)) {
  submissions = JSON.parse(fs.readFileSync(submissionsPath));
}

// 🔍 Get employee details
app.get('/employee/:id', (req, res) => {
  const id = req.params.id;
  const data = employeeData[id] || { name: '', departments: [], tasks: [] };

  // Include task status map
  const taskStatus = {};
  submissions
    .filter(s => s.employeeId === id)
    .forEach(s => {
      taskStatus[s.task] = s.status;
    });

  res.json({ ...data, taskStatus });
});

app.get('/all-employees', (req, res) => {
  res.json(employeeData);
});

app.post('/add-employee', (req, res) => {
  const { id, name, departments, tasks } = req.body;

  if (employeeData[id]) {
    return res.status(400).json({ message: 'Employee ID already exists.' });
  }

  employeeData[id] = { name, departments, tasks };
  res.json({ message: 'Employee added successfully.' });
});


// ✅ Submit task status
app.post('/submit', (req, res) => {
  const { employeeId, task, status } = req.body;

  const existing = submissions.find(
    s => s.employeeId === employeeId && s.task === task
  );

  if (existing && existing.status === 'Completed') {
    return res.status(400).json({
      message: 'Task already marked as Completed. Cannot resubmit.',
    });
  }

  if (existing && existing.status === 'Attempted' && status === 'Attempted') {
    return res.status(400).json({
      message: 'Task already attempted. You must mark it as Completed.',
    });
  }

  if (existing) {
    existing.status = status;
  } else {
    submissions.push({ ...req.body, timestamp: new Date().toISOString() });
  }

  fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));
  res.json({ message: 'Submission recorded successfully.' });
});

// 📊 Get all submissions
app.get('/submissions', (req, res) => {
  res.json(submissions);
});

// 📈 Summary by employee
app.get('/summary-by-employee', (req, res) => {
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

  res.json(Object.values(summaryMap));
});

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/upload-adhoc-csv', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const adhoc = fs.existsSync(adhocPath)
    ? JSON.parse(fs.readFileSync(adhocPath))
    : {};

  const newEntries = [];

  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (row) => {
      const id = row.id;
      if (!employeeData[id]) {
        const entry = {
          name: row.name,
          departments: row.departments.split(';'),
          tasks: row.tasks.split(';'),
        };
        employeeData[id] = entry;
        adhoc[id] = entry;
        newEntries.push(id);
      }
    })
    .on('end', () => {
      fs.writeFileSync(adhocPath, JSON.stringify(adhoc, null, 2));
      fs.unlinkSync(filePath); // clean up temp file
      res.json({ message: `Uploaded ${newEntries.length} new employees.` });
    });
});


app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
