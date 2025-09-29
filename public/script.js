document.getElementById('emp-id').addEventListener('blur', async function () {
  const empId = this.value.trim();
  if (!empId) return;

  try {
    const res = await fetch(`/employee/${empId}`);
    const data = await res.json();

    document.getElementById('emp-name').value = data.name || '';
    populateSelect('department', data.departments);
    populateTaskOptions(data.tasks);
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

function populateTaskOptions(tasks) {
  const container = document.getElementById('task-options');
  container.innerHTML = '';
  tasks.forEach(task => {
    const label = document.createElement('label');
    label.style.display = 'block';

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'task';
    radio.value = task;
    radio.required = true;

    label.appendChild(radio);
    label.appendChild(document.createTextNode(` ${task}`));
    container.appendChild(label);
  });
}

document.getElementById('task-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const selectedTask = document.querySelector('input[name="task"]:checked');
  if (!selectedTask) {
    alert('Please select a task.');
    return;
  }

  const payload = {
    employeeId: document.getElementById('emp-id').value,
    employeeName: document.getElementById('emp-name').value,
    department: document.getElementById('department').value,
    task: selectedTask.value,
    status: document.getElementById('status').value,
  };

  try {
    const res = await fetch('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    alert(result.message);
    document.getElementById('task-form').reset();
    const radios = document.querySelectorAll('input[name="task"]');
    radios.forEach(r => r.checked = false);
    document.getElementById('task-options').innerHTML = '';

  } catch (err) {
    console.error('Error submitting form:', err);
    alert('Submission failed.');
  }
});
