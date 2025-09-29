const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

app.post('/submit', (req, res) => {
  const newEntry = req.body;
  const filePath = path.join(__dirname, 'submissions.json');
  let data = [];

  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath));
  }

  data.push(newEntry);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.status(200).send({ message: 'Submission saved!' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
