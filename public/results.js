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

  function loadResults() {
  fetch('/submissions')
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#results-table tbody');
      tbody.innerHTML = ''; // Clear old rows
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
    });
}


// Call on page load
loadResults();

// Optional: expose this function globally if you want to call it from script.js
window.loadResults = loadResults;
