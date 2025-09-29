document.addEventListener('DOMContentLoaded', () => {
  const bibInput = document.getElementById('bibInput');
  const climberNameDisplay = document.getElementById('climberNameDisplay');
  const categorySelect = document.getElementById('categorySelect');
  const laneSelect = document.getElementById('laneSelect');
  const timingForm = document.getElementById('timingForm');
  const messageBox = document.getElementById('message');

  const laneMap = {
    Novice: ['Lane A', 'Lane B'],
    Intermediate: ['Lane C', 'Lane D'],
    Open: ['Lane E', 'Lane F'],
    Team: ['Lane G', 'Lane H'],
    Enduro: ['Lane I', 'Lane J']
  };

  bibInput.addEventListener('blur', async () => {
    const bib = bibInput.value.trim();
    if (!bib) return;

    const climberName = await fetchClimberName(bib);
    climberNameDisplay.textContent = climberName
      ? `Climber: ${climberName}`
      : '❌ Bib not found';
  });

  categorySelect.addEventListener('change', () => {
    const category = categorySelect.value;
    laneSelect.innerHTML = '<option value="">Select Lane</option>';

    (laneMap[category] || []).forEach(lane => {
      const option = document.createElement('option');
      option.value = lane;
      option.textContent = lane;
      laneSelect.appendChild(option);
    });
  });

  timingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageBox.textContent = '';

    const bib = bibInput.value.trim();
    const climber = climberNameDisplay.textContent.replace('Climber: ', '').trim();
    const category = categorySelect.value;
    const lane = laneSelect.value;
    const time = parseFloat(document.getElementById('laneTime').value);

    if (!bib || !climber || !category || !lane || isNaN(time)) {
      messageBox.textContent = 'Please fill in all fields correctly.';
      return;
    }

    const payload = { bib, climber, category, lane, time };

    try {
      const res = await fetch('/submit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        messageBox.textContent = '✅ Time submitted!';
        timingForm.reset();
        climberNameDisplay.textContent = '';
        laneSelect.innerHTML = '<option value="">Select Lane</option>';
      } else {
        const errorText = await res.text();
        messageBox.textContent = '❌ ' + errorText;
      }
    } catch (err) {
      console.error(err);
      messageBox.textContent = '❌ Server error';
    }
  });

  async function fetchClimberName(bib) {
    try {
      const res = await fetch(`/climbers/${bib}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.name;
    } catch {
      return null;
    }
  }
});
