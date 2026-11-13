# Notes App

A simple web-based notes application built with Node.js and Express.

This application allows users to efficiently manage their notes with a clean and intuitive interface. Users can create, edit, delete, and organize their notes with ease.

![Notes App Home Page](doc/images/image.png)

Key features include:
- Create new notes with a title and content
- Edit existing notes to keep information up-to-date
- Delete notes that are no longer needed
- Archive notes to keep your main view clutter-free
- Unarchive notes when you need to access them again
- Search functionality to quickly find specific notes

![Create New Note](doc/images/image-2.png)

The app provides a seamless experience for keeping track of your thoughts, ideas, and important information. Whether you're a student, professional, or anyone who likes to stay organized, this Notes App is designed to meet your note-taking needs.

You can access the live application at [https://notes-app-819b.onrender.com/](https://notes-app-819b.onrender.com/).


## Features

- Create, read, update, and delete notes
- Board view and Timeline view (notes grouped by Today, Yesterday, This week and month, with a "jump to" list)
- Pin important notes to the top
- Tags with one-click tag filters
- Tickable checklists (start a line with `[ ]`)
- Undo delete: deleted notes go to a bin for 30 days and can be restored from the "Undo" message
- Sort by newest, oldest, recently edited or A to Z
- Archive and unarchive notes, optionally including archived notes in search and views
- Search across titles, text and tags with highlighted matches
- Themes: Match my device (default), Light, Dark, Notebook, Retro, Terminal, Blueprint and Paperback — pick one from the Theme menu; the choice is remembered
- Keyboard shortcuts: `N` new note, `/` search, `B` board, `T` timeline, `Esc` close

## Prerequisites

- Node.js
- npm (Node Package Manager)

## Installation

1. Clone the repository:
~~~bash
git clone https://github.com/yourusername/notes-app.git 
~~~


2. Install dependencies:
~~~bash
cd notes-app
npm install 
~~~


3. Run the application:
~~~bash
node server.js
~~~

4. Open your web browser and navigate to `http://localhost:3000`

The first time the app starts with no notes, it loads a set of sample notes (including a few archived ones) so every feature can be tried right away. Run `npm run seed` at any time to wipe all notes (including the bin) and reload the samples.

## API Endpoints

- `GET /`: Home page
- `POST /create`: Create a new note
- `POST /update/:id`: Update an existing note
- `DELETE /delete/:id`: Delete a note
- `POST /archive/:id`: Archive a note
- `POST /unarchive/:id`: Unarchive a note
- `GET /search`: Search for notes

## Project Structure

- `server.js`: Main application file
- `data/`: Directory for storing active notes
- `archived/`: Directory for storing archived notes
- `public/`: Directory for static files
- `views/`: Directory for EJS templates

## Dependencies

- express
- ejs
- ejs-layouts

## License

This project is licensed under the MIT License.
