fetch('/submissions')
  .then(res => res.json())
  .then(data => {
    const tbody = document.querySelector('#results-table tbody');
    data.forEach(entry => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${entry.employeeId}</td>
        <td>${entry.employeeName}</td>
        <td>${entry.department}</td>
        <td>${entry.task}</td>
        <td>${entry.status}</td>
      `;
      tbody.appendChild(row);
    });
  })
  .catch(err => {
    console.error('Error loading submissions:', err);
  });
