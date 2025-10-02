async function loadEmployees() {
  const res = await fetch('/all-employees');
  const data = await res.json();
  const tbody = document.querySelector('#employee-table tbody');
  tbody.innerHTML = '';

  Object.entries(data).forEach(([id, emp]) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${id}</td>
      <td>${emp.name}</td>
      <td>${emp.departments.join(', ')}</td>
      <td>${emp.tasks.join(', ')}</td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById('add-employee-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const payload = {
    id: document.getElementById('new-id').value.trim(),
    name: document.getElementById('new-name').value.trim(),
    departments: document.getElementById('new-departments').value.trim().split(';'),
    tasks: document.getElementById('new-tasks').value.trim().split(';'),
  };

  const res = await fetch('/add-employee', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const result = await res.json();
  alert(result.message);
  loadEmployees();
  this.reset();
});

loadEmployees();
