fetch('/summary-by-employee')
  .then(res => res.json())
  .then(data => {
    const tbody = document.querySelector('#summary-table tbody');
    data.forEach(entry => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${entry.employeeId}</td>
        <td>${entry.employeeName}</td>
        <td>${entry.Completed}</td>
        <td>${entry.Attempted}</td>
      `;
      tbody.appendChild(row);
    });
  })
  .catch(err => {
    console.error('Error loading individual summary:', err);
  });
