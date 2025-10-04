const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const multer = require('multer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const employeeData = {};
const submissionsPath = path.join(__dirname, 'submissions.json');
const adhocPath = path.join(__dirname, 'adhoc-employees.json');
let submissions = [];
const taskStatusStore = {};
const employees = [];

// 🔄 Load CSV employees
function preloadEmployeeCSV() {
  return new Promise((resolve) => {
    fs.createReadStream('employee.csv')
      .pipe(csv())
      .on('data', (row) => {
        if (!row.id || !row.name || !row.department) return;
        employeeData[row.id] = {
          name: row.name.trim(),
          departments: [row.department.trim()]
        };
        employees.push({
          employeeId: row.id.trim(),
          name: row.name.trim(),
          department: row.department.trim()
        });
      })
      .on('end', resolve);
  });
}

// 🔄 Load adhoc employees
function preloadAdhocEmployees() {
  if (fs.existsSync(adhocPath)) {
    const adhoc = JSON.parse(fs.readFileSync(adhocPath));
    Object.entries(adhoc).forEach(([id, emp]) => {
      employeeData[id] = emp;
    });
  }
}

// 🔄 Load submissions
if (fs.existsSync(submissionsPath)) {
  submissions = JSON.parse(fs.readFileSync(submissionsPath));
}

// 🧠 Task registry by department
const taskRegistry = {
  HR: Array.from({ length: 8 }, (_, i) => ({ number: i + 1 })),
  Engineering: Array.from({ length: 8 }, (_, i) => ({ number: i + 11 })),
  Sales: Array.from({ length: 8 }, (_, i) => ({ number: i + 21 }))
};

function getTaskStatus(employeeId) {
  return taskStatusStore[employeeId] || {};
}

// 🚀 Routes

app.get('/employee/:id', (req, res) => {
  const emp = employeeData[req.params.id];
  if (!emp) return res.status(404).json({ message: 'Employee not found' });

  const department = Array.isArray(emp.departments) ? emp.departments[0] : emp.departments;
  const tasks = taskRegistry[department] || [];

  res.json({
    name: emp.name,
    departments: [department],
    tasks,
    taskStatus: getTaskStatus(req.params.id)
  });
});

app.get('/all-employees', (req, res) => {
  res.json(employeeData);
});

app.post('/add-employee', (req, res) => {
  const { id, name, departments } = req.body;

  if (employeeData[id]) {
    return res.status(400).json({ message: 'Employee ID already exists.' });
  }

  const newEmp = { name, departments };
  employeeData[id] = newEmp;

  let adhoc = {};
  if (fs.existsSync(adhocPath)) {
    adhoc = JSON.parse(fs.readFileSync(adhocPath));
  }
  adhoc[id] = newEmp;
  fs.writeFileSync(adhocPath, JSON.stringify(adhoc, null, 2));

  res.json({ message: 'Employee added successfully.' });
});

app.post('/submit', (req, res) => {
  const { employeeId, department, taskNumber, status } = req.body;

  const employee = employees.find(e => e.employeeId === employeeId);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  const validTasks = taskRegistry[department] || [];
  const isValidTask = validTasks.some(t => t.number === parseInt(taskNumber));

  if (!isValidTask) {
    return res.status(400).json({ message: 'Task does not belong to the specified department.' });
  }

  const existing = submissions.find(
    s => s.employeeId === employeeId && s.taskNumber === taskNumber
  );

  if (existing && existing.status === 'Completed') {
    return res.status(400).json({ message: 'Task already marked as Completed. Cannot resubmit.' });
  }

  if (existing && existing.status === 'Attempted' && status === 'Attempted') {
    return res.status(400).json({ message: 'Task already attempted. You must mark it as Completed.' });
  }

  if (existing) {
    existing.status = status;
  } else {
    submissions.push({ ...req.body, timestamp: new Date().toISOString() });
  }

  taskStatusStore[employeeId] = taskStatusStore[employeeId] || {};
  taskStatusStore[employeeId][taskNumber] = status;

  fs.writeFileSync(submissionsPath, JSON.stringify(submissions, null, 2));
  res.json({ message: `Task ${taskNumber} marked as ${status} for ${employee.name}` });
});

app.get('/submissions', (req, res) => {
  res.json(submissions);
});

app.get('/summary-by-employee', (req, res) => {
  const summaryMap = {};

  submissions.forEach(entry => {
    const id = entry.employeeId;
    if (!summaryMap[id]) {
      summaryMap[id] = {
        employeeId: id,
        employeeName: entry.employeeName,
        Completed: 0,
        Attempted: 0
      };
    }
    if (entry.status === 'Completed') summaryMap[id].Completed++;
    else if (entry.status === 'Attempted') summaryMap[id].Attempted++;
  });

  res.json(Object.values(summaryMap));
});

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
          departments: row.departments.split(';')
        };
        employeeData[id] = entry;
        adhoc[id] = entry;
        newEntries.push(id);
      }
    })
    .on('end', () => {
      fs.writeFileSync(adhocPath, JSON.stringify(adhoc, null, 2));
      fs.unlinkSync(filePath);
      res.json({ message: `Uploaded ${newEntries.length} new employees.` });
    });
});

// 🟢 Start server
preloadEmployeeCSV().then(() => {
  preloadAdhocEmployees();
  app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
  });
});
