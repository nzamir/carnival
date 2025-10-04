const fs = require('fs');
const csv = require('csv-parser');
const express = require('express');
const app = express();

app.use(express.json());

const employees = [];

// 🧼 Load employee CSV (no tasks column anymore)
fs.createReadStream('employee.csv')
  .pipe(csv())
  .on('data', row => {
    if (!row.id || !row.name || !row.department) {
      console.warn('Skipping malformed row:', row);
      return;
    }

    employees.push({
      employeeId: row.id.trim(),
      name: row.name.trim(),
      department: row.department.trim()
    });
  })
  .on('end', () => {
    console.log(`Loaded ${employees.length} employees`);
  });

// 🧠 Central task registry by department
const taskRegistry = {
  HR: Array.from({ length: 8 }, (_, i) => ({
    number: i + 1,
    label: `Task ${i + 1}`,
    department: 'HR'
  })),
  Engineering: Array.from({ length: 8 }, (_, i) => ({
    number: i + 11,
    label: `Task ${i + 11}`,
    department: 'Engineering'
  })),
  Sales: Array.from({ length: 8 }, (_, i) => ({
    number: i + 21,
    label: `Task ${i + 21}`,
    department: 'Sales'
  }))
};

// 🧩 Optional: task status store (in-memory or from DB)
const taskStatusStore = {}; // { E001: { 11: 'Completed', 12: 'Attempted' }, ... }

function getTaskStatus(employeeId) {
  return taskStatusStore[employeeId] || {};
}

// 🚀 Employee lookup route
app.get('/employee/:id', (req, res) => {
  const employee = employees.find(e => e.employeeId === req.params.id);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  const tasks = taskRegistry[employee.department] || [];

  res.json({
    name: employee.name,
    departments: [employee.department],
    tasks,
    taskStatus: getTaskStatus(employee.employeeId)
  });
});

// ✅ Submission route
app.post('/submit', (req, res) => {
  const { employeeId, department, taskNumber, status } = req.body;

  const employee = employees.find(e => e.employeeId === employeeId);
  if (!employee) return res.status(404).json({ message: 'Employee not found' });

  const validTasks = taskRegistry[department] || [];
  const isValidTask = validTasks.some(t => t.number === parseInt(taskNumber));

  if (!isValidTask) {
    return res.status(400).json({ message: 'Task does not belong to the specified department.' });
  }

  // Update task status
  taskStatusStore[employeeId] = taskStatusStore[employeeId] || {};
  taskStatusStore[employeeId][taskNumber] = status;

  res.json({ message: `Task ${taskNumber} marked as ${status} for ${employee.name}` });
});

// 🟢 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
