const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const newChatBtn = document.getElementById("newChat");
const crisisBanner = document.getElementById("crisisBanner");
const chatEl = document.getElementById("chat");

let currentTopic = null;
let currentMood = null;

const TOPIC_INTROS = {
  stress: "Stress can feel heavy. What has been putting the most pressure on you lately?",
  anxiety: "Anxiety is exhausting. What have your worries been like lately?",
  low_mood: "I'm sorry things have felt low. What has the last few days been like for you?",
  loneliness: "Feeling lonely is painful. What has been making you feel disconnected?",
  sleep: "Poor sleep affects everything. What has your sleep been like recently?",
  anger: "It's okay to feel angry. What happened that set it off?",
  relationships: "Relationships can be hard. Who or what is on your mind?",
  self_esteem: "Being hard on yourself is tiring. What have you been telling yourself lately?",
  grief: "I'm sorry for your loss. Would you like to tell me about who or what you are missing?",
};

function makeId() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : "s-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

let sessionId = localStorage.getItem("session_id");
if (!sessionId) {
  sessionId = makeId();
  localStorage.setItem("session_id", sessionId);
}

// Show the centered "Ready when you are" screen only while there are no messages
function syncEmptyState() {
  chatEl.classList.toggle("empty", messagesEl.children.length === 0);
}

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = "msg " + type;
  div.textContent = text; // textContent keeps user/bot text safe from HTML injection
  messagesEl.appendChild(div);
  syncEmptyState();
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage(text, "user");
  inputEl.value = "";
  inputEl.style.height = "auto";
  sendBtn.disabled = true;

  const typing = addMessage("Typing...", "bot typing");

  try {
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, message: text, topic: currentTopic, mood: currentMood }),
    });
    const data = await res.json();
    typing.remove();

    if (data.reply) {
      addMessage(data.reply, "bot");
      crisisBanner.classList.toggle("hidden", data.risk !== "crisis");
    } else {
      addMessage(data.error || "Something went wrong. Please try again.", "error");
    }
  } catch (err) {
    typing.remove();
    addMessage("Cannot reach the server. Is app_free.py running?", "error");
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
});

newChatBtn.addEventListener("click", async () => {
  try {
    await fetch("/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch (e) { /* ignore, start fresh anyway */ }
  sessionId = makeId();
  localStorage.setItem("session_id", sessionId);
  messagesEl.innerHTML = "";
  crisisBanner.classList.add("hidden");
  currentTopic = null;
  currentMood = null;
  document.querySelectorAll(".selected").forEach((b) => b.classList.remove("selected"));
  syncEmptyState(); // back to the "Ready when you are" screen
});

syncEmptyState();


// ---- mood check-in ----
document.querySelectorAll("#moodButtons button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll("#moodButtons button").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    currentMood = parseInt(btn.dataset.score, 10);
    try {
      await fetch("/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, score: currentMood }),
      });
    } catch (e) { /* mood still used for this chat even if saving fails */ }
    if (currentMood <= 2) {
      addMessage("Thank you for sharing that. It sounds like today has been hard. I'm here, and there's no rush. What's on your mind?", "bot");
    } else if (currentMood >= 4) {
      addMessage("I'm glad to hear that. Is there anything that has been helping you lately, or anything you'd like to talk about?", "bot");
    } else {
      addMessage("Thanks for checking in. Would you like to talk about what's behind that feeling?", "bot");
    }
  });
});

// ---- topic chips ----
document.querySelectorAll("#topics button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#topics button").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    currentTopic = btn.dataset.topic;
    addMessage(TOPIC_INTROS[currentTopic], "bot");
    inputEl.focus();
  });
});

// ---- grounding exercise ----
document.getElementById("groundBtn").addEventListener("click", () => {
  addMessage(
    "Let's try 5-4-3-2-1 grounding. Take a slow breath, then notice:\n" +
    "5 things you can see\n4 things you can touch\n3 things you can hear\n" +
    "2 things you can smell\n1 thing you can taste\n\nTake your time. Tell me how you feel afterwards.",
    "bot"
  );
});

// ---- breathing exercise (4 in, 4 hold, 6 out) ----
const overlay = document.getElementById("breathOverlay");
const circle = document.getElementById("breathCircle");
const breathText = document.getElementById("breathText");
let breathTimer = null;

function breathCycle() {
  circle.className = "breath-circle inhale";
  breathText.textContent = "Breathe in";
  breathTimer = setTimeout(() => {
    circle.className = "breath-circle hold";
    breathText.textContent = "Hold";
    breathTimer = setTimeout(() => {
      circle.className = "breath-circle exhale";
      breathText.textContent = "Breathe out";
      breathTimer = setTimeout(breathCycle, 6000);
    }, 4000);
  }, 4000);
}

document.getElementById("breatheBtn").addEventListener("click", () => {
  overlay.classList.remove("hidden");
  breathCycle();
});

document.getElementById("breathClose").addEventListener("click", () => {
  clearTimeout(breathTimer);
  overlay.classList.add("hidden");
  circle.className = "breath-circle";
  breathText.textContent = "Get ready";
  addMessage("Well done. How are you feeling after that?", "bot");
});

// ---- sidebar toggle ----
const appEl = document.getElementById("app");
function toggleSidebar() {
  appEl.classList.toggle("sidebar-collapsed");
  appEl.classList.toggle("sidebar-open");
}
document.getElementById("sidebarToggle").addEventListener("click", toggleSidebar);
document.getElementById("sidebarOpen").addEventListener("click", toggleSidebar);