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
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const OOO_STATUS_EL = document.getElementById("status");
const OOO_FORM_EL = document.getElementById("ooo-form");
const STEP_STATUS_EL = document.getElementById("step-status");
const STEP_FORM_EL = document.getElementById("step-form");
const GOAL_FORM_EL = document.getElementById("goal-form");
const GOAL_INPUT_EL = document.getElementById("goalCount");
const STEP_DATE_INPUT_EL = document.getElementById("stepDate");

const AUGUST_START = "2026-08-01";
const AUGUST_END = "2026-08-31";

const AUGUST_ISO_DATES = [];
const AUGUST_LABELS = [];
for (let day = 1; day <= 31; day += 1) {
  const dayString = String(day).padStart(2, "0");
  AUGUST_ISO_DATES.push(`2026-08-${dayString}`);
  AUGUST_LABELS.push(`Aug ${day}`);
}

const AUGUST_INDEX_BY_DATE = Object.fromEntries(
  AUGUST_ISO_DATES.map((date, index) => [date, index]),
);

const CHART_COLORS = [
  "#2b4df6",
  "#ef6520",
  "#16a34a",
  "#d946ef",
  "#0f766e",
  "#e11d48",
  "#7c3aed",
  "#0369a1",
  "#ca8a04",
  "#4b5563",
];

let teamGoal = 0;
let stepRows = [];
let stepChart = null;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const eventsCollection = collection(db, "oooEvents");
const stepEntriesCollection = collection(db, "stepEntries");
const stepSettingsDoc = doc(db, "stepChallenge", "config");

setupTabs();
setupDefaultStepDate();

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
      setOooStatus("Entry deleted.");
    } catch (error) {
      console.error(error);
      setOooStatus(`Could not delete entry. ${formatFirebaseError(error)}`);
    }
  },
});

calendar.render();
setOooStatus("Loading events...");

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
    setOooStatus(`Synced ${events.length} event(s). Click an event to delete it.`);
  },
  (error) => {
    console.error(error);
    setOooStatus(`Could not load events. ${formatFirebaseError(error)}`);
  },
);

OOO_FORM_EL.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(OOO_FORM_EL);
  const name = String(formData.get("name") || "").trim();
  const startDate = String(formData.get("startDate") || "").trim();
  const endDate = String(formData.get("endDate") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!name || !startDate || !endDate) {
    setOooStatus("Name, start date, and end date are required.");
    return;
  }

  if (endDate < startDate) {
    setOooStatus("End date must be the same as or after start date.");
    return;
  }

  setOooStatus("Saving...");

  try {
    await addDoc(eventsCollection, {
      name,
      startDate,
      endDate,
      location,
      notes,
      createdAt: serverTimestamp(),
    });
    OOO_FORM_EL.reset();
    setOooStatus("Saved. Everyone sees updates automatically.");
  } catch (error) {
    console.error(error);
    setOooStatus(`Could not save entry. ${formatFirebaseError(error)}`);
  }
});

setupStepChart();
setStepStatus("Loading step data...");

const stepQuery = query(stepEntriesCollection, orderBy("date", "asc"));
onSnapshot(
  stepQuery,
  (snapshot) => {
    stepRows = snapshot.docs.map((record) => {
      const data = record.data();
      return {
        id: record.id,
        name: String(data.name || "").trim(),
        date: String(data.date || "").trim(),
        steps: Number.parseInt(String(data.steps || 0), 10),
      };
    });

    renderStepChart();
    setStepStatus(`Synced ${stepRows.length} step entr${stepRows.length === 1 ? "y" : "ies"}.`);
  },
  (error) => {
    console.error(error);
    setStepStatus(`Could not load step data. ${formatFirebaseError(error)}`);
  },
);

onSnapshot(
  stepSettingsDoc,
  (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : {};
    const parsedGoal = Number.parseInt(String(data.teamGoal || 0), 10);
    teamGoal = Number.isFinite(parsedGoal) && parsedGoal > 0 ? parsedGoal : 0;

    if (teamGoal > 0) {
      GOAL_INPUT_EL.value = String(teamGoal);
    }

    renderStepChart();
  },
  (error) => {
    console.error(error);
    setStepStatus(`Could not load team goal. ${formatFirebaseError(error)}`);
  },
);

STEP_FORM_EL.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(STEP_FORM_EL);
  const name = String(formData.get("stepName") || "").trim();
  const date = String(formData.get("stepDate") || "").trim();
  const stepsValue = Number.parseInt(String(formData.get("stepCount") || "0"), 10);

  if (!name || !date || !Number.isFinite(stepsValue)) {
    setStepStatus("Name, date, and steps are required.");
    return;
  }

  if (!isAugustDate(date)) {
    setStepStatus("Date must be within August 2026.");
    return;
  }

  if (stepsValue < 0) {
    setStepStatus("Steps must be 0 or more.");
    return;
  }

  setStepStatus("Saving step entry...");

  try {
    await addDoc(stepEntriesCollection, {
      name,
      date,
      steps: stepsValue,
      createdAt: serverTimestamp(),
    });
    STEP_FORM_EL.reset();
    STEP_DATE_INPUT_EL.value = defaultStepDate();
    setStepStatus("Step entry saved.");
  } catch (error) {
    console.error(error);
    setStepStatus(`Could not save step entry. ${formatFirebaseError(error)}`);
  }
});

GOAL_FORM_EL.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(GOAL_FORM_EL);
  const goalValue = Number.parseInt(String(formData.get("goalCount") || "0"), 10);
  if (!Number.isFinite(goalValue) || goalValue <= 0) {
    setStepStatus("Goal must be a number greater than 0.");
    return;
  }

  setStepStatus("Saving team goal...");

  try {
    await setDoc(
      stepSettingsDoc,
      {
        teamGoal: goalValue,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    setStepStatus("Team goal saved.");
  } catch (error) {
    console.error(error);
    setStepStatus(`Could not save team goal. ${formatFirebaseError(error)}`);
  }
});

function addDays(dateString, dayCount) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(date.getDate() + dayCount);
  return date.toISOString().slice(0, 10);
}

function setOooStatus(message) {
  OOO_STATUS_EL.textContent = message;
}

function setStepStatus(message) {
  STEP_STATUS_EL.textContent = message;
}

function setupTabs() {
  const buttons = Array.from(document.querySelectorAll(".tab-button"));
  const views = Array.from(document.querySelectorAll(".tracker-view"));

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const viewName = button.dataset.view;

      buttons.forEach((candidate) => {
        candidate.classList.toggle("active", candidate === button);
      });

      views.forEach((view) => {
        const shouldShow = view.id === `view-${viewName}`;
        view.classList.toggle("active", shouldShow);
      });

      if (viewName === "steps" && stepChart) {
        window.setTimeout(() => stepChart.resize(), 0);
      }
    });
  });
}

function setupDefaultStepDate() {
  STEP_DATE_INPUT_EL.value = defaultStepDate();
}

function defaultStepDate() {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  if (isAugustDate(todayIso)) {
    return todayIso;
  }

  return AUGUST_START;
}

function isAugustDate(dateString) {
  return dateString >= AUGUST_START && dateString <= AUGUST_END;
}

function setupStepChart() {
  const canvas = document.getElementById("steps-chart");
  if (!(canvas instanceof HTMLCanvasElement)) {
    setStepStatus("Could not load step chart.");
    return;
  }

  if (typeof Chart === "undefined") {
    setStepStatus("Chart library did not load.");
    return;
  }

  stepChart = new Chart(canvas, {
    type: "line",
    data: {
      labels: AUGUST_LABELS,
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          position: "bottom",
        },
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
            color: "#2f2c71",
          },
          grid: {
            color: "rgba(68, 62, 172, 0.2)",
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#2f2c71",
          },
          grid: {
            color: "rgba(68, 62, 172, 0.2)",
          },
          title: {
            display: true,
            text: "Steps",
            color: "#2f2c71",
            font: {
              weight: "bold",
            },
          },
        },
      },
    },
  });
}

function renderStepChart() {
  if (!stepChart) {
    return;
  }

  const stepsByPerson = {};
  const teamTotals = AUGUST_ISO_DATES.map(() => 0);

  stepRows.forEach((entry) => {
    if (!entry.name || !Object.hasOwn(AUGUST_INDEX_BY_DATE, entry.date)) {
      return;
    }

    const dayIndex = AUGUST_INDEX_BY_DATE[entry.date];
    const normalizedSteps = Number.isFinite(entry.steps) ? Math.max(0, entry.steps) : 0;

    if (!Object.hasOwn(stepsByPerson, entry.name)) {
      stepsByPerson[entry.name] = AUGUST_ISO_DATES.map(() => 0);
    }

    stepsByPerson[entry.name][dayIndex] += normalizedSteps;
    teamTotals[dayIndex] += normalizedSteps;
  });

  const personNames = Object.keys(stepsByPerson).sort((a, b) => a.localeCompare(b));
  const datasets = personNames.map((name, index) => ({
    label: name,
    data: stepsByPerson[name],
    borderColor: CHART_COLORS[index % CHART_COLORS.length],
    backgroundColor: "transparent",
    borderWidth: 2,
    pointRadius: 3,
    tension: 0.25,
  }));

  datasets.push({
    label: "Team Total",
    data: teamTotals,
    borderColor: "#111111",
    backgroundColor: "transparent",
    borderWidth: 3,
    pointRadius: 3,
    tension: 0.22,
  });

  if (teamGoal > 0) {
    datasets.push({
      label: "Team Goal",
      data: AUGUST_ISO_DATES.map(() => teamGoal),
      borderColor: "#1f8a39",
      backgroundColor: "transparent",
      borderDash: [7, 5],
      borderWidth: 2,
      pointRadius: 0,
      tension: 0,
    });
  }

  stepChart.data.labels = AUGUST_LABELS;
  stepChart.data.datasets = datasets;
  stepChart.update();
}

function formatFirebaseError(error) {
  if (!error || typeof error !== "object") {
    return "Unknown error.";
  }

  const code = "code" in error ? String(error.code) : "unknown";
  const message = "message" in error ? String(error.message) : "No message provided.";
  return `[${code}] ${message}`;
}
