function loadIndividualSummary() {
  fetch('/summary-by-employee', { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      const tbody = document.querySelector('#summary-table tbody');
      tbody.innerHTML = ''; // Clear old rows
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
}

// Initial load
loadIndividualSummary();

// Optional: expose globally so script.js can call it after submission
window.loadIndividualSummary = loadIndividualSummary;
