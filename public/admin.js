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
    department: document.getElementById('new-departments').value.trim().split(';'),
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

document.getElementById('upload-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('adhoc-upload');
  const file = fileInput.files[0];
  if (!file) {
    alert('Please select a CSV file.');
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/upload-adhoc-csv', {
      method: 'POST',
      body: formData,
    });

    const result = await res.json();
    alert(result.message);
    loadEmployees(); // refresh table
    fileInput.value = '';
  } catch (err) {
    console.error('Upload failed:', err);
    alert('Failed to upload CSV.');
  }
});


loadEmployees();
