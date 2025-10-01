document.getElementById('emp-id').addEventListener('blur', async function () {
  const empId = this.value.trim();
  if (!empId) return;

  try {
    const res = await fetch(`/employee/${empId}`);
    const data = await res.json();

    document.getElementById('emp-name').value = data.name || '';
    document.getElementById('department').value = data.departments[0] || '';
    populateTaskOptions(data.tasks, data.taskStatus || {});
  } catch (err) {
    console.error('Error fetching employee data:', err);
    alert('Failed to fetch employee details.');
  }
});

function populateSelect(id, options) {
  const select = document.getElementById(id);
  select.innerHTML = '';
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });
}

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
    radio.value = task;
    radio.id = `task-${task}`;
    radio.required = true;

    const label = document.createElement('label');
    label.htmlFor = radio.id;
    label.textContent = `Task ${task}`;

    if (taskStatus[task] === 'Completed') {
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

document.getElementById('task-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const selectedTask = document.querySelector('input[name="task"]:checked');
  const status = document.getElementById('status').value;

  if (!selectedTask) {
    alert('Please select a task.');
    return;
  }

  if (!status) {
    alert('Please select a status.');
    return;
  }

  const payload = {
    employeeId: document.getElementById('emp-id').value,
    employeeName: document.getElementById('emp-name').value,
    department: document.getElementById('department').value,
    task: selectedTask.value,
    status,
  };

  try {
    const res = await fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.message || 'Submission failed.');
      return;
    }

    alert(result.message);
    document.getElementById('task-form').reset();
    document.getElementById('task-options').innerHTML = '';
    document.getElementById('status').innerHTML = '';
    document.getElementById('status').disabled = true;

    if (window.loadResults) {
      window.loadResults();
    }
  } catch (err) {
    console.error('Error submitting form:', err);
    alert('Submission failed.');
  }
});
