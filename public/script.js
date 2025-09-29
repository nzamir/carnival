document.getElementById('task-form').addEventListener('submit', function (e) {
  e.preventDefault();
  const data = {
    employeeId: document.getElementById('emp-id').value,
    employeeName: document.getElementById('emp-name').value,
    department: document.getElementById('department').value,
    taskNumber: document.getElementById('task-number').value,
    status: document.getElementById('status').value,
  };

  fetch('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
    .then(res => res.json())
    .then(response => alert(response.message))
    .catch(err => alert('Error submitting form'));
});
