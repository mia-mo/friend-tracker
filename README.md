# Friend Tracker

A small two-page web app for tracking:

- when friends are out of town
- a shared step challenge for August 2026

The app uses plain HTML, CSS, and JavaScript, plus Firebase for saving and syncing data.

## Project Files

- `index.html` - the "Out of town" page
- `steps.html` - the "Step challenge" page
- `app.js` - JavaScript for the out-of-town calendar page
- `steps.js` - JavaScript for the step challenge page
- `firebase-config.js` - Firebase connection settings
- `styles.css` - shared page styling

## How The Pages Work

### 1. Out of Town Page

This page lets you add a friend name, start date, end date, optional location, and optional notes.

It uses:

- `form` to collect user input
- `input` for short text, dates, and numbers
- `textarea` for longer notes
- `button` to submit the form
- `section` to group related parts of the page
- FullCalendar to show the saved entries on a calendar

When you submit an entry, JavaScript sends it to Firebase Firestore. The calendar updates automatically when data changes.

### 2. Step Challenge Page

This page lets you save daily step counts, edit past entries, and set a team goal.

It uses:

- `select` for choosing a name from a list
- `input type="date"` for picking a day in August 2026
- `input type="number"` for step counts and the team goal
- `canvas` for the step chart
- Chart.js to draw the graph

The list of entries can be filtered by name, and the chart updates in real time from Firebase.

## HTML Basics Used Here

If you are new to HTML, these are the main tags you will see in this project:

- `<!doctype html>` tells the browser this is a modern HTML page
- `<html>` wraps the whole document
- `<head>` holds page settings like the title, CSS links, and metadata
- `<body>` contains the visible page content
- `<main>` holds the main content of the page
- `<nav>` contains the page links
- `<section>` groups related content into panels
- `<form>` collects user input
- `<label>` gives each field a description
- `<input>` creates text boxes, date pickers, and number fields
- `<select>` creates a dropdown menu
- `<textarea>` creates a larger text box
- `<button>` creates clickable actions
- `<div>` is a general container for layout
- `<canvas>` is used for the step chart
- `<script type="module">` loads the JavaScript file for the page

## Firebase Basics Used Here

Firebase is used as the data store for both pages.

### Firestore Collections

- `oooEvents` stores out-of-town entries
- `stepEntries` stores daily step entries
- `stepChallenge/config` stores the team goal

### Common Firebase Operations

- `initializeApp(firebaseConfig)` connects the app to Firebase
- `getFirestore(app)` gets the Firestore database
- `collection(db, "name")` points to a collection of documents
- `doc(db, "collection", "id")` points to one document
- `addDoc(...)` creates a new document
- `setDoc(..., { merge: true })` updates a document without replacing everything
- `updateDoc(...)` changes an existing document
- `deleteDoc(...)` removes a document
- `onSnapshot(...)` listens for live updates and refreshes the page automatically
- `query(..., orderBy(...))` sorts records before they are shown
- `serverTimestamp()` adds a Firebase-generated save time

### Why `onSnapshot` Matters

`onSnapshot` is the reason the pages feel live.

- when someone saves, edits, or deletes data in Firebase
- every connected browser automatically gets the new data
- the calendar, list, and chart update without a manual refresh

## Step Chart Explanation

The step page builds a line graph from the saved entries.

- each person gets their own line
- the team total is shown as a darker line
- the team goal is shown as a dashed line when a goal is set
- the chart uses cumulative totals, so each day adds onto the previous day

A few extra notes:

- dates are limited to August 2026
- the chart only shows days up to the current date
- past entries can be edited from the list

## Running The App

This project is a simple static site.

- open `index.html` or `steps.html` in a browser
- or serve the folder with any local static server

If you use Firebase, make sure the project settings in `firebase-config.js` match your Firebase project.

## Quick Customization Ideas

- change the names in the step challenge dropdown
- adjust the August date range in `steps.js`
- update the colors in `styles.css`
- add more fields to the out-of-town form
- change the chart or calendar libraries if you want a different look
