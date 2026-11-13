// Formatting and grouping helpers shared by the note templates.
// Times are shown in the visitor's timezone: the browser stores its UTC offset
// (in minutes, east positive) in a cookie, and every date here is shifted by it.

const DAY = 24 * 60 * 60 * 1000;
const TINTS = ['sky', 'sage', 'butter', 'rose', 'lilac', 'paper'];
const CHECK_LINE = /^(\s*(?:[-*]\s+)?)\[( |x|X)\]\s?(.*)$/;

// Notes without a saved colour get a stable one based on their id
function tintFor(note) {
  if (TINTS.includes(note.color)) return note.color;
  return TINTS[Number(String(note.id).slice(-3)) % TINTS.length] || 'paper';
}

function local(ts, tz) {
  return new Date(Number(ts) + (tz || 0) * 60 * 1000);
}

function formatDate(ts, tz, withYear = true) {
  const date = local(ts, tz);
  if (isNaN(date)) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: withYear ? 'numeric' : undefined, timeZone: 'UTC' });
}

function formatTime(ts, tz) {
  const date = local(ts, tz);
  if (isNaN(date)) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
}

function timeAgo(ts, now) {
  const minutes = Math.round((now - ts) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return days === 1 ? 'yesterday' : `${days} days ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? 'a month ago' : `${months} months ago`;
}

// A note counts as edited if it changed more than a minute after it was written
function wasEdited(note) {
  return Number(note.updatedAt) - Number(note.id) > 60 * 1000;
}

// Split note text into plain lines and checklist items ("[ ] buy milk", "[x] done")
function noteLines(content) {
  return String(content || '').split('\n').map((line, index) => {
    const match = CHECK_LINE.exec(line);
    if (match) return { type: 'check', index, checked: match[2] !== ' ', text: match[3] };
    return { type: line.trim() ? 'text' : 'blank', index, text: line };
  });
}

function checklistProgress(content) {
  const items = noteLines(content).filter(line => line.type === 'check');
  return { done: items.filter(item => item.checked).length, total: items.length };
}

function sortNotes(notes, sort) {
  const list = notes.slice();
  const sorters = {
    newest: (a, b) => b.id - a.id,
    oldest: (a, b) => a.id - b.id,
    edited: (a, b) => (b.updatedAt || b.id) - (a.updatedAt || a.id),
    az: (a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }),
  };
  return list.sort(sorters[sort] || sorters.newest);
}

// Group notes by the day they were written: Today, Yesterday, Earlier this week, then by month
function timelineGroups(notes, now, tz) {
  const today = local(now, tz);
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const groups = [];

  notes
    .slice()
    .sort((a, b) => b.id - a.id)
    .forEach(note => {
      const written = local(note.id, tz).getTime();
      let key;
      let label;
      let recent = true;
      if (written >= startOfToday) {
        key = 'today';
        label = 'Today';
      } else if (written >= startOfToday - DAY) {
        key = 'yesterday';
        label = 'Yesterday';
      } else if (written >= startOfToday - 6 * DAY) {
        key = 'this-week';
        label = 'Earlier this week';
      } else {
        const date = new Date(written);
        key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
        recent = false;
      }
      let group = groups.find(g => g.key === key);
      if (!group) {
        group = { key, label, recent, anchor: `when-${key}`, notes: [] };
        groups.push(group);
      }
      group.notes.push(note);
    });

  return groups;
}

module.exports = {
  tintFor,
  formatDate,
  formatTime,
  timeAgo,
  wasEdited,
  noteLines,
  checklistProgress,
  sortNotes,
  timelineGroups,
};
