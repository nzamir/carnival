document.getElementById('emp-id').addEventListener('blur', async function () {
  const empId = this.value.trim();
  if (!empId) return;

  const res = await fetch(`/employee/${empId}`);
  const data = await res.json();

  document.getElementById('emp-name').value = data.name || '';
  populateSelect('department', data.departments);
  populateSelect('task', data.tasks);
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

document.getElementById('task-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const payload = {
    employeeId: document.getElementById('emp-id').value,
    employeeName: document.getElementById('emp-name').value,
    department: document.getElementById('department').value,
    task: document.getElementById('task').value,
    status: document.getElementById('status').value,
  };

  const res = await fetch('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  alert(result.message);
});
