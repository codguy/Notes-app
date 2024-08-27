// Required modules
const express = require('express');
const ejs_layout = require('ejs-layouts');
const fs = require('fs');

// Initialize Express app
const app = express();
const port = 3000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ejs_layout.express);
app.use(express.static('public'));

// View engine setup
app.set('view engine', 'ejs');

// Helper Functions
function renderView(res, title, content) {
  res.layout('layout', { title: title }, { body: content });
}

function getFileInDir(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, function (err, files) {
      if (err) {
        console.log('Unable to scan directory: ' + err.message);
        resolve([]);
        return;
      }
      let fileReadPromises = files.map(file => {
        return new Promise((resolve, reject) => {
          fs.readFile(path + '/' + file, 'utf8', function (err, data) {
            if (err) reject(err);
            try {
              const jsonData = JSON.parse(data);
              resolve(jsonData);
            } catch (parseError) {
              reject(parseError);
            }
          });
        });
      });
      Promise.all(fileReadPromises)
        .then(fileContents => {
          resolve(fileContents);
        })
        .catch(error => {
          console.error('Error reading files:', error);
          resolve([]);
        });
    });
  });
}

// Routes

// Home page
app.get('/', (req, res) => {
  let notes = getFileInDir('./data');
  let notes_archived = getFileInDir('./archived');

  Promise.all([notes, notes_archived])
    .then(([notesData, archivedData]) => {
      renderView(res, 'Home', { block: "index", data: { title: "Satnam", notes: notesData, archived: archivedData } });
    });
});

// Create note
app.post('/create', (req, res) => {
  req.body.id = new Date().valueOf();
  fs.writeFile(`./data/${req.body.id}.json`, JSON.stringify(req.body), 'utf8', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Saved file : ${req.body.id}.json`);
    }
  });
  res.redirect('/');
});

// Update note
app.post('/update/:id', (req, res) => {
  req.body.id = req.params.id;
  fs.writeFile(`./data/${req.body.id}.json`, JSON.stringify(req.body), 'utf8', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(`Saved file : ${req.body.id}.json`);
    }
  });
  res.redirect('/');
});

// Delete note
app.delete('/delete/:id', (req, res) => {
  const path = `./data/${req.params.id}.json`;
  fs.unlink(path, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: 'Error deleting file' });
    } else {
      console.log('Deleted!');
      res.status(200).json({ success: true, message: 'File deleted successfully' });
    }
  });
});

// Archive note
app.post('/archive/:id', (req, res) => {
  fs.rename(`./data/${req.params.id}.json`, `./archived/${req.params.id}.json`, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: err.message });
    } else {
      console.log('Moved!');
      res.status(200).json({ success: true, message: 'File moved successfully' });
    }
  });
});

// Unarchive note
app.post('/unarchive/:id', (req, res) => {
  fs.rename(`./archived/${req.params.id}.json`, `./data/${req.params.id}.json`, (err) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: err.message });
    } else {
      console.log('Moved!');
      res.status(200).json({ success: true, message: 'File moved successfully' });
    }
  });
});

// Search notes
app.get('/search', (req, res) => {
  let notes = getFileInDir('./data');

  notes.then((notesData) => {
    const searchTerm = req.query.term.toLowerCase();
    const filteredNotes = notesData.filter(note =>
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm)
    );
    res.render('notes', { notes: filteredNotes });
  }).catch(error => {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  });
});

// Start the server
app.listen(port, () => {
  console.log('Server listening on http://localhost:3000');
});
