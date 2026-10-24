const API_URL = "/api/participants";

const EVENT_CLASS_MAP = {
  "AI Prompt Challenge": "event-ai",
  "Code Sprint": "event-code",
  "Bug Smash": "event-bug",
  "Tech Quiz": "event-quiz",
};

const form = document.getElementById("registration-form");
const nameInput = document.getElementById("student-name");
const rollInput = document.getElementById("roll-no");
const eventSelect = document.getElementById("event-name");
const registerBtn = document.getElementById("register-btn");

const tbody = document.getElementById("leaderboard-body");
const statParticipants = document.getElementById("stat-participants");
const statTopScore = document.getElementById("stat-top-score");
const statEvents = document.getElementById("stat-events");
const participantCount = document.getElementById("participant-count");
const toastContainer = document.getElementById("toast-container");

let participants = [];

document.addEventListener("DOMContentLoaded", () => {
  form.addEventListener("submit", handleRegister);
  loadParticipants(true);
});

async function request(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;

  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok) {
    throw new Error((data && data.message) || `Request failed (${response.status})`);
  }

  return data;
}

async function loadParticipants(showLoading = true) {
  if (showLoading) {
    renderLoading();
  }

  try {
    const data = await request(API_URL);
    participants = Array.isArray(data) ? data : [];
    renderParticipants();
  } catch (error) {
    if (showLoading) {
      renderEmpty("Could not load the leaderboard", error.message);
    }
    showToast(error.message, "error");
  }
}

function renderParticipants() {
  updateStats();
  tbody.innerHTML = "";
  tbody.setAttribute("aria-busy", "false");

  if (participants.length === 0) {
    renderEmpty("No participants yet", "Register the first competitor to start the leaderboard.");
    return;
  }

  const fragment = document.createDocumentFragment();

  participants.forEach((participant, index) => {
    fragment.appendChild(createRow(participant, index));
  });

  tbody.appendChild(fragment);
}

function createRow(participant, index) {
  const row = document.createElement("tr");

  const rankCell = document.createElement("td");
  rankCell.dataset.label = "Rank";
  const rankBadge = document.createElement("span");
  rankBadge.className = "rank-badge";
  if (index < 3) {
    rankBadge.classList.add(`rank-${index + 1}`);
  }
  rankBadge.textContent = String(index + 1);
  rankCell.appendChild(rankBadge);

  const nameCell = document.createElement("td");
  nameCell.dataset.label = "Student Name";
  const student = document.createElement("div");
  student.className = "student";
  const avatar = document.createElement("span");
  avatar.className = "avatar";
  avatar.style.setProperty("--hue", String(hueFromString(participant.studentName)));
  avatar.textContent = getInitials(participant.studentName);
  avatar.setAttribute("aria-hidden", "true");
  const name = document.createElement("span");
  name.className = "student-name";
  name.textContent = participant.studentName;
  student.append(avatar, name);
  nameCell.appendChild(student);

  const rollCell = document.createElement("td");
  rollCell.dataset.label = "Roll No";
  const roll = document.createElement("span");
  roll.className = "roll-no";
  roll.textContent = participant.rollNo;
  rollCell.appendChild(roll);

  const eventCell = document.createElement("td");
  eventCell.dataset.label = "Event Name";
  const eventBadge = document.createElement("span");
  eventBadge.className = `event-badge ${getEventClass(participant.eventName)}`;
  eventBadge.textContent = participant.eventName;
  eventCell.appendChild(eventBadge);

  const scoreCell = document.createElement("td");
  scoreCell.dataset.label = "Current Score";
  scoreCell.className = "align-right";
  const score = document.createElement("span");
  score.className = "score-value";
  score.textContent = String(participant.score ?? 0);
  const scoreUnit = document.createElement("span");
  scoreUnit.className = "score-unit";
  scoreUnit.textContent = "pts";
  score.append(scoreUnit);
  scoreCell.appendChild(score);

  const awardCell = document.createElement("td");
  awardCell.dataset.label = "Award";
  awardCell.className = "align-center";
  const awardActions = document.createElement("div");
  awardActions.className = "row-actions";
  const pointsBtn = document.createElement("button");
  pointsBtn.type = "button";
  pointsBtn.className = "btn btn-pts";
  pointsBtn.textContent = "+10 Pts";
  pointsBtn.setAttribute("aria-label", `Award 10 points to ${participant.studentName}`);
  pointsBtn.addEventListener("click", () => {
    incrementScore(participant._id, pointsBtn, participant.studentName);
  });
  awardActions.appendChild(pointsBtn);
  awardCell.appendChild(awardActions);

  const deleteCell = document.createElement("td");
  deleteCell.dataset.label = "Action";
  deleteCell.className = "align-center";
  const deleteActions = document.createElement("div");
  deleteActions.className = "row-actions";
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn btn-delete";
  deleteBtn.textContent = "Delete";
  deleteBtn.setAttribute("aria-label", `Delete ${participant.studentName}`);
  deleteBtn.addEventListener("click", () => {
    deleteParticipant(participant._id, participant.studentName, deleteBtn);
  });
  deleteActions.appendChild(deleteBtn);
  deleteCell.appendChild(deleteActions);

  row.append(rankCell, nameCell, rollCell, eventCell, scoreCell, awardCell, deleteCell);
  return row;
}

async function handleRegister(event) {
  event.preventDefault();

  const studentName = nameInput.value.trim();
  const rollNo = rollInput.value.trim();
  const eventName = eventSelect.value;

  if (!studentName || !rollNo || !eventName) {
    showToast("Please fill in all fields.", "error");
    return;
  }

  const originalLabel = registerBtn.innerHTML;
  registerBtn.disabled = true;
  registerBtn.textContent = "Registering…";

  try {
    await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName, rollNo, eventName }),
    });

    form.reset();
    await loadParticipants(false);
    showToast(`${studentName} registered for ${eventName}.`, "success");
    nameInput.focus();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    registerBtn.disabled = false;
    registerBtn.innerHTML = originalLabel;
  }
}

async function incrementScore(id, button, studentName) {
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "+10…";

  try {
    await request(`${API_URL}/${id}/score`, { method: "PATCH" });
    await loadParticipants(false);
    showToast(`${studentName} earned +10 points.`, "success");
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

async function deleteParticipant(id, studentName, button) {
  const confirmed = window.confirm(`Remove ${studentName} from the leaderboard?`);
  if (!confirmed) {
    return;
  }

  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Removing…";

  try {
    await request(`${API_URL}/${id}`, { method: "DELETE" });
    await loadParticipants(false);
    showToast(`${studentName} was removed.`, "success");
  } catch (error) {
    showToast(error.message, "error");
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

function updateStats() {
  const total = participants.length;
  const topScore = participants.reduce(
    (highest, participant) => Math.max(highest, Number(participant.score) || 0),
    0
  );
  const uniqueEvents = new Set(participants.map((participant) => participant.eventName)).size;

  statParticipants.textContent = String(total);
  statTopScore.textContent = String(topScore);
  statEvents.textContent = String(uniqueEvents);
  participantCount.textContent = `${total} participant${total === 1 ? "" : "s"}`;
}

function renderLoading() {
  tbody.innerHTML = "";
  tbody.setAttribute("aria-busy", "true");

  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 7;
  cell.className = "empty-cell";

  const state = document.createElement("div");
  state.className = "empty-state";
  const spinner = document.createElement("span");
  spinner.className = "spinner";
  spinner.setAttribute("aria-hidden", "true");
  const message = document.createElement("p");
  message.textContent = "Loading leaderboard…";

  state.append(spinner, message);
  cell.appendChild(state);
  row.appendChild(cell);
  tbody.appendChild(row);
}

function renderEmpty(title, subtitle) {
  tbody.innerHTML = "";
  tbody.setAttribute("aria-busy", "false");

  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = 7;
  cell.className = "empty-cell";

  const state = document.createElement("div");
  state.className = "empty-state";
  const message = document.createElement("p");
  message.textContent = title;
  const hint = document.createElement("small");
  hint.textContent = subtitle;

  state.append(message, hint);
  cell.appendChild(state);
  row.appendChild(cell);
  tbody.appendChild(row);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;

  const text = document.createElement("span");
  text.textContent = message;
  toast.appendChild(text);
  toastContainer.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

function getEventClass(eventName) {
  return EVENT_CLASS_MAP[eventName] || "event-default";
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function hueFromString(value) {
  const text = String(value || "");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 360;
  }

  return hash;
}
