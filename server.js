// Required modules
const express = require('express');
const ejs_layout = require('ejs-layouts');
const fs = require('fs');
const seed = require('./seed');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Where notes live: one JSON file per note
const DATA_DIR = './data';
const ARCHIVED_DIR = './archived';
const TRASH_DIR = './trash';
const TRASH_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(ejs_layout.express);
app.use(express.static('public'));

// Load sample notes the first time the app runs
if (seed({ dataDir: DATA_DIR, archivedDir: ARCHIVED_DIR })) {
  console.log('Loaded sample notes');
}

// View engine setup
app.set('view engine', 'ejs');
app.locals.h = require('./lib/view-helpers');

// Helper Functions
function renderView(res, title, content) {
  res.layout('layout', { title: title }, { body: content });
}

function getFileInDir(path) {
  return new Promise((resolve, reject) => {
    fs.readdir(path, function (err, files) {
      if (err) {
        if (err.code !== 'ENOENT') console.log('Unable to scan directory: ' + err.message);
        resolve([]);
        return;
      }
      let fileReadPromises = files.filter(file => file.endsWith('.json')).map(file => {
        return new Promise((resolve, reject) => {
          fs.readFile(path + '/' + file, 'utf8', function (err, data) {
            if (err) return reject(err);
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

// Note ids are creation timestamps; only accept digits so ids can't escape the notes folders
function isValidId(id) {
  return /^\d+$/.test(String(id));
}

function notePath(dir, id) {
  return `${dir}/${id}.json`;
}

function readNote(dir, id) {
  try {
    return JSON.parse(fs.readFileSync(notePath(dir, id), 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeNote(dir, note) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(notePath(dir, note.id), JSON.stringify(note), 'utf8');
}

function moveNote(fromDir, toDir, id) {
  fs.mkdirSync(toDir, { recursive: true });
  fs.renameSync(notePath(fromDir, id), notePath(toDir, id));
}

// "home, Travel ,home" -> ["home", "travel"]
function parseTags(value) {
  const list = Array.isArray(value) ? value : String(value || '').split(',');
  return [...new Set(list.map(tag => String(tag).trim().toLowerCase().replace(/^#/, '')).filter(Boolean))].slice(0, 10);
}

// Turn the submitted form into the fields a note stores
function noteFields(body) {
  return {
    title: String(body.title || '').trim(),
    content: String(body.content || '').replace(/\r\n/g, '\n'),
    color: body.color,
    tags: parseTags(body.tags),
  };
}

// View preferences are kept in a cookie so the page renders the right view straight away
function readPrefs(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(part => {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key] = decodeURIComponent(rest.join('='));
  });
  return {
    view: cookies.view === 'timeline' ? 'timeline' : 'board',
    sort: ['newest', 'oldest', 'edited', 'az'].includes(cookies.sort) ? cookies.sort : 'newest',
    showArchived: cookies.showArchived === '1',
    tzOffset: Number.isFinite(Number(cookies.tz)) ? Number(cookies.tz) : 0,
  };
}

// Load notes (and archived notes when asked) and apply the search box and tag filter
async function loadNotes({ term = '', tag = '', includeArchived = false }) {
  const [active, archived] = await Promise.all([getFileInDir(DATA_DIR), getFileInDir(ARCHIVED_DIR)]);
  let notes = active.map(note => ({ ...note, archived: false }));
  if (includeArchived) notes = notes.concat(archived.map(note => ({ ...note, archived: true })));

  const searchTerm = term.trim().toLowerCase();
  if (searchTerm) {
    notes = notes.filter(note =>
      (note.title || '').toLowerCase().includes(searchTerm) ||
      (note.content || '').toLowerCase().includes(searchTerm) ||
      (note.tags || []).some(t => t.includes(searchTerm))
    );
  }
  if (tag) notes = notes.filter(note => (note.tags || []).includes(tag));

  return { notes, active, archived };
}

function tagCounts(notes) {
  const counts = {};
  notes.forEach(note => (note.tags || []).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function viewData(req, notes) {
  const prefs = readPrefs(req);
  return {
    notes,
    prefs,
    searchTerm: (req.query.term || '').trim(),
    activeTag: req.query.tag || '',
    now: Date.now(),
  };
}

// Permanently remove notes that have been in the bin for longer than TRASH_DAYS
function emptyOldTrash() {
  getFileInDir(TRASH_DIR).then(notes => {
    notes
      .filter(note => Date.now() - (note.deletedAt || 0) > TRASH_DAYS * DAY)
      .forEach(note => fs.unlink(notePath(TRASH_DIR, note.id), () => {}));
  });
}
emptyOldTrash();

// Routes

// Home page
app.get('/', async (req, res) => {
  const prefs = readPrefs(req);
  const { notes, active, archived } = await loadNotes({
    term: req.query.term || '',
    tag: req.query.tag || '',
    includeArchived: prefs.showArchived,
  });

  renderView(res, 'Home', {
    block: 'index',
    data: {
      ...viewData(req, notes),
      counts: {
        notes: active.length,
        pinned: active.filter(note => note.pinned).length,
        archived: archived.length,
      },
      tags: tagCounts(prefs.showArchived ? active.concat(archived) : active),
      archived,
    },
  });
});

// Notes list only (board or timeline) — used by search, tag filters and view switches
app.get(['/notes', '/search'], async (req, res) => {
  try {
    const prefs = readPrefs(req);
    const { notes } = await loadNotes({
      term: req.query.term || '',
      tag: req.query.tag || '',
      includeArchived: prefs.showArchived,
    });
    res.render('notes', viewData(req, notes));
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
});

// Create note
app.post('/create', (req, res) => {
  const id = Date.now();
  const note = { id, ...noteFields(req.body), pinned: false, updatedAt: id };
  try {
    writeNote(DATA_DIR, note);
    console.log(`Saved file : ${id}.json`);
  } catch (err) {
    console.error(err.message);
  }
  res.redirect('back');
});

// Update note — keeps fields the form doesn't send (pinned, created date)
app.post('/update/:id', (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) return res.redirect('back');

  const dir = readNote(DATA_DIR, id) ? DATA_DIR : ARCHIVED_DIR;
  const existing = readNote(dir, id) || { id: Number(id), pinned: false };
  const note = { ...existing, ...noteFields(req.body), id: existing.id, updatedAt: Date.now() };
  try {
    writeNote(dir, note);
    console.log(`Saved file : ${id}.json`);
  } catch (err) {
    console.error(err.message);
  }
  res.redirect('back');
});

// Pin / unpin note
app.post('/pin/:id', (req, res) => {
  const { id } = req.params;
  const note = isValidId(id) && readNote(DATA_DIR, id);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

  note.pinned = !note.pinned;
  writeNote(DATA_DIR, note);
  res.json({ success: true, pinned: note.pinned });
});

// Tick / untick a checklist line ("[ ] item" <-> "[x] item")
app.post('/toggle/:id/:line', (req, res) => {
  const { id } = req.params;
  const lineIndex = Number(req.params.line);
  const dir = isValidId(id) && (readNote(DATA_DIR, id) ? DATA_DIR : ARCHIVED_DIR);
  const note = dir && readNote(dir, id);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

  const lines = (note.content || '').split('\n');
  const match = /^(\s*(?:[-*]\s+)?)\[( |x|X)\]/.exec(lines[lineIndex] || '');
  if (!match) return res.status(409).json({ success: false, message: 'That line is no longer a checklist item' });

  const checked = match[2] === ' ';
  lines[lineIndex] = match[1] + (checked ? '[x]' : '[ ]') + lines[lineIndex].slice(match[0].length);
  note.content = lines.join('\n');
  note.updatedAt = Date.now();
  writeNote(dir, note);
  res.json({ success: true, checked, content: note.content });
});

// Delete note — moves it to the bin so it can be restored for TRASH_DAYS days
app.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  const dir = isValidId(id) && [DATA_DIR, ARCHIVED_DIR].find(d => readNote(d, id));
  if (!dir) return res.status(404).json({ success: false, message: 'Note not found' });

  try {
    const note = readNote(dir, id);
    writeNote(TRASH_DIR, { ...note, deletedAt: Date.now(), deletedFrom: dir === ARCHIVED_DIR ? 'archived' : 'data' });
    fs.unlinkSync(notePath(dir, id));
    console.log('Moved to bin!');
    res.status(200).json({ success: true, message: 'Note moved to the bin' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: 'Error deleting file' });
  }
});

// Restore a deleted note from the bin
app.post('/restore/:id', (req, res) => {
  const { id } = req.params;
  const note = isValidId(id) && readNote(TRASH_DIR, id);
  if (!note) return res.status(404).json({ success: false, message: 'Note not found in the bin' });

  const { deletedAt, deletedFrom, ...restored } = note;
  try {
    writeNote(deletedFrom === 'archived' ? ARCHIVED_DIR : DATA_DIR, restored);
    fs.unlinkSync(notePath(TRASH_DIR, id));
    res.json({ success: true, message: 'Note restored' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Archive note
app.post('/archive/:id', (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid note' });
  try {
    moveNote(DATA_DIR, ARCHIVED_DIR, req.params.id);
    console.log('Moved!');
    res.status(200).json({ success: true, message: 'File moved successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Unarchive note
app.post('/unarchive/:id', (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid note' });
  try {
    moveNote(ARCHIVED_DIR, DATA_DIR, req.params.id);
    console.log('Moved!');
    res.status(200).json({ success: true, message: 'File moved successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
