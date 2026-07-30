import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const statusEl = document.getElementById("status");
const formEl = document.getElementById("ooo-form");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const eventsCollection = collection(db, "oooEvents");

const calendar = new FullCalendar.Calendar(document.getElementById("calendar"), {
  initialView: "dayGridMonth",
  height: "auto",
  firstDay: 1,
  headerToolbar: {
    left: "prev,next today",
    center: "title",
    right: "dayGridMonth,timeGridWeek,listMonth",
  },
  eventClick: async (clickInfo) => {
    const eventData = clickInfo.event.extendedProps;
    const who = eventData.name || "this event";
    const shouldDelete = window.confirm(`Delete ${who}'s OOO entry?`);
    if (!shouldDelete) {
      return;
    }

    try {
      await deleteDoc(doc(db, "oooEvents", clickInfo.event.id));
      setStatus("Entry deleted.");
    } catch (error) {
      console.error(error);
      setStatus("Could not delete entry.");
    }
  },
});

calendar.render();
setStatus("Loading events...");

const eventsQuery = query(eventsCollection, orderBy("startDate", "asc"));
onSnapshot(
  eventsQuery,
  (snapshot) => {
    const events = snapshot.docs.map((record) => {
      const data = record.data();
      const locationText = data.location ? ` - ${data.location}` : "";
      const notesText = data.notes ? `\n${data.notes}` : "";

      return {
        id: record.id,
        title: `${data.name}${locationText}`,
        start: data.startDate,
        // FullCalendar expects all-day end dates to be exclusive.
        end: addDays(data.endDate, 1),
        allDay: true,
        extendedProps: {
          name: data.name,
          location: data.location || "",
          notes: data.notes || "",
        },
        description: `${data.name}${locationText}${notesText}`,
      };
    });

    calendar.removeAllEvents();
    calendar.addEventSource(events);
    setStatus(`Synced ${events.length} event(s). Click an event to delete it.`);
  },
  (error) => {
    console.error(error);
    setStatus("Could not load events. Check Firebase config and rules.");
  },
);

formEl.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(formEl);
  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name || !startDate || !endDate) {
    setStatus("Name, start date, and end date are required.");
    return;
  }

  if (endDate < startDate) {
    setStatus("End date must be the same as or after start date.");
    return;
  }

  setStatus("Saving...");

  try {
    await addDoc(eventsCollection, {
      name,
      startDate,
      endDate,
      location,
      notes,
      createdAt: serverTimestamp(),
    });
    formEl.reset();
    setStatus("Saved. Everyone sees updates automatically.");
  } catch (error) {
    console.error(error);
    setStatus("Could not save entry.");
  }
});

function addDays(dateString, dayCount) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

function setStatus(message) {
  statusEl.textContent = message;
}
