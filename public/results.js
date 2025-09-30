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
  fetch('/submissions', { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#results-table tbody');
      tbody.innerHTML = ''; // Clear previous rows

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

      // ✅ Move this outside the loop
      const updated = document.getElementById('last-updated');
      if (updated) {
        updated.textContent = 'Last updated: ' + new Date().toLocaleTimeString();
      }
    })
    .catch(err => {
      console.error('Error loading submissions:', err);
    });
}

// Initial load
loadResults();
window.loadResults = loadResults;
setInterval(loadResults, 5000); // Refresh every 5 seconds
