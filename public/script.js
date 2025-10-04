document.getElementById('emp-id').addEventListener('blur', async function () {
  const empId = this.value.trim();
  if (!empId) return;

  try {
    const res = await fetch(`/employee/${empId}`);
    const data = await res.json();

    const name = data.name || '';
    const department = data.departments?.[0] || '';
    const taskStatus = data.taskStatus || {};

    document.getElementById('emp-name').value = name;
    document.getElementById('department').value = department;

    const tasks = getDepartmentTasks(department);
    populateTaskOptions(tasks, taskStatus);
  } catch (err) {
    console.error('Error fetching employee data:', err);
    alert('Failed to fetch employee details.');
  }
});

// 🧠 Task registry by department
function getDepartmentTasks(department) {
  const ranges = {
    HR: { start: 1, end: 8 },
    Engineering: { start: 11, end: 18 },
    Sales: { start: 21, end: 28 }
  };

  const range = ranges[department];
  if (!range) return [];

  return Array.from({ length: range.end - range.start + 1 }, (_, i) => {
    const number = range.start + i;
    return {
      number,
      label: `Task ${number}`,
      department
    };
  });
}

// 🧩 Render task options
function populateTaskOptions(tasks, taskStatus) {
  const container = document.getElementById('task-options');
  const statusSelect = document.getElementById('status');

  container.innerHTML = '';
  statusSelect.innerHTML = '';
  statusSelect.disabled = true;

  tasks.forEach(task => {
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'task';
    radio.value = task.number;
    radio.id = `task-${task.number}`;
    radio.required = true;
    radio.dataset.label = task.label;
    radio.dataset.department = task.department;

    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.textContent = `${task.label} (${task.department})`;

    if (taskStatus[task.number] === 'Completed') {
      radio.disabled = true;
      label.style.color = '#999';
      label.title = 'Already completed';
    }

    container.appendChild(radio);
    container.appendChild(label);
  });

  container.addEventListener('change', () => {
    const selected = document.querySelector('input[name="task"]:checked');
    statusSelect.innerHTML = '';

    if (selected && taskStatus[selected.value] !== 'Completed') {
      statusSelect.disabled = false;

      ['Attempted', 'Completed'].forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        statusSelect.appendChild(option);
      });

      statusSelect.value = taskStatus[selected.value] || 'Attempted';
    } else {
      statusSelect.disabled = true;
    }
  });
}

// 🚀 Submit form
document.getElementById('task-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const selectedTask = document.querySelector('input[name="task"]:checked');
  const status = document.getElementById('status').value;

  if (!selectedTask) return alert('Please select a task.');
  if (!status) return alert('Please select a status.');

  const payload = {
    employeeId: document.getElementById('emp-id').value,
    employeeName: document.getElementById('emp-name').value,
    department: selectedTask.dataset.department,
    taskNumber: selectedTask.value,
    taskLabel: selectedTask.dataset.label,
    status
  };

  try {
    const res = await fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.message || 'Submission failed.');
      return;
    }

    alert(result.message);
    document.getElementById('task-form').reset();
    document.getElementById('task-options').innerHTML = '';
    statusSelect.innerHTML = '';
    statusSelect.disabled = true;

    if (window.loadResults) window.loadResults();
  } catch (err) {
    console.error('Error submitting form:', err);
    alert('Submission failed.');
  }
});
