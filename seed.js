// Sample notes that showcase the app: colours, pins, tags, checklists, edited notes,
// notes spread over several months (for the timeline) and a few archived notes.
// Runs automatically on startup when there are no notes yet.
// Run `npm run seed` to wipe all notes (including the bin) and reload the samples.
const fs = require('fs');
const path = require('path');

const HOUR = 60 * 60 * 1000;

// `ago` is how long before now the note was written (in hours), `editedAgo` when it last changed
const sampleNotes = [
  {
    ago: 0.2,
    color: 'butter',
    pinned: true,
    tags: ['getting-started'],
    title: 'Welcome to your notes 👋',
    content: 'A quick tour of what you can do:\n\n[x] Write a note with the New note button (or press N)\n[ ] Pin a note so it stays at the top\n[ ] Tap a tag like #travel to see only those notes\n[ ] Switch to Timeline to see notes by date\n[ ] Delete something, then press Undo\n\nPress / to search. Matches get highlighted.',
  },
  {
    ago: 3,
    editedAgo: 0.5,
    color: 'sage',
    pinned: true,
    tags: ['home', 'shopping'],
    title: 'Groceries',
    content: '[x] Oat milk\n[x] Sourdough\n[ ] Avocados (ripe!)\n[ ] Cherry tomatoes\n[ ] Greek yogurt\n[ ] Coffee beans, the Ethiopian ones',
  },
  {
    ago: 26,
    color: 'sky',
    tags: ['social', 'books'],
    title: 'Book club: next meeting',
    content: 'Thursday at 7pm, Maya\'s place.\nWe\'re discussing chapters 8–14. Bring snacks.',
  },
  {
    ago: 2 * 24 + 5,
    editedAgo: 20,
    color: 'lilac',
    tags: ['ideas'],
    title: 'App ideas',
    content: 'A plant-watering reminder that learns from the weather.\nA shared shopping list that sorts itself by supermarket aisle.\nA tiny journal that only asks one question a day.',
  },
  {
    ago: 4 * 24 + 2,
    color: 'rose',
    pinned: true,
    tags: ['family'],
    title: 'Mum\'s birthday: 14 Nov',
    content: '[x] Book the Italian restaurant she loved\n[ ] Buy the ceramics class voucher\n[ ] Call Sam about splitting the cost',
  },
  {
    ago: 9 * 24,
    color: 'sky',
    tags: ['travel'],
    title: 'Lisbon weekend: packing list',
    content: '[x] Rain jacket\n[x] Walking shoes\n[ ] Phone charger + power bank\n[ ] Sunscreen\n[ ] Passport\n[ ] Snacks for the flight',
  },
  {
    ago: 12 * 24 + 6,
    editedAgo: 3 * 24,
    color: 'sage',
    tags: ['health'],
    title: 'Workout plan',
    content: 'Mon: 5k run\nWed: upper body + core\nFri: yoga\nSun: long walk with a podcast',
  },
  {
    ago: 19 * 24,
    color: 'paper',
    tags: ['quotes'],
    title: 'Quote',
    content: '"The best time to plant a tree was 20 years ago. The second best time is now."',
  },
  {
    ago: 33 * 24,
    color: 'butter',
    tags: ['home', 'recipes'],
    title: 'Pasta recipe to try',
    content: 'Lemon & garlic spaghetti: zest two lemons, fry garlic in olive oil, toss with pasta water, parmesan and lots of black pepper. Finish with basil.',
  },
  {
    ago: 47 * 24,
    editedAgo: 10 * 24,
    color: 'lilac',
    tags: ['travel', 'ideas'],
    title: 'Places to visit next year',
    content: 'Lisbon (booked!)\nKyoto in cherry blossom season\nThe Scottish Highlands\nA week somewhere with no Wi-Fi',
  },
  {
    ago: 68 * 24,
    color: 'rose',
    tags: ['health'],
    title: 'Dentist follow-up',
    content: 'Check-up went fine. Next appointment in six months. Remember to floss!',
  },
  {
    ago: 95 * 24,
    color: 'sky',
    tags: ['books'],
    title: 'Books to read',
    content: '[x] The Midnight Library\n[x] Project Hail Mary\n[ ] Tomorrow, and Tomorrow, and Tomorrow\n[ ] Braiding Sweetgrass',
  },
];

const sampleArchived = [
  {
    ago: 21 * 24,
    color: 'rose',
    tags: ['home'],
    title: 'Renew car insurance',
    content: 'Done. Renewed until next October.',
  },
  {
    ago: 52 * 24,
    color: 'lilac',
    tags: ['home'],
    title: 'Old Wi-Fi password',
    content: 'Router was replaced, keeping this just in case.',
  },
  {
    ago: 110 * 24,
    color: 'paper',
    tags: ['books'],
    title: 'Summer reading list',
    content: 'Finished all five books!',
  },
];

function jsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(file => file.endsWith('.json'));
}

function writeNotes(dir, notes, now) {
  fs.mkdirSync(dir, { recursive: true });
  notes.forEach(({ ago, editedAgo, ...note }, index) => {
    // Small per-note offset keeps every id (the creation time) unique
    const id = Math.round(now - ago * HOUR - index * 1000);
    const updatedAt = editedAgo !== undefined ? Math.round(now - editedAgo * HOUR) : id;
    const full = { id, title: note.title, content: note.content, color: note.color, tags: note.tags || [], pinned: !!note.pinned, updatedAt };
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(full), 'utf8');
  });
}

function seed({ dataDir, archivedDir, trashDir, force = false }) {
  const hasNotes = jsonFiles(dataDir).length > 0 || jsonFiles(archivedDir).length > 0;
  if (hasNotes && !force) return false;

  [dataDir, archivedDir, trashDir].filter(Boolean).forEach(dir => {
    jsonFiles(dir).forEach(file => fs.unlinkSync(path.join(dir, file)));
  });

  const now = Date.now();
  writeNotes(dataDir, sampleNotes, now);
  writeNotes(archivedDir, sampleArchived, now);
  return true;
}

module.exports = seed;

if (require.main === module) {
  seed({ dataDir: './data', archivedDir: './archived', trashDir: './trash', force: true });
  console.log(`Loaded ${sampleNotes.length} sample notes and ${sampleArchived.length} archived notes.`);
}
