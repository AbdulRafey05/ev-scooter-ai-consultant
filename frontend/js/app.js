// ============================================================
//  EV Scooter AI Consultant — Frontend JavaScript
//  City of Lights Edition (Karachi Only)
// ============================================================

const API_URL = "http://localhost:5000/api/chat";

// ── Step bar config ──────────────────────────────────────────
const STEPS    = ["s1","s2","s3","s4","s5","s6"];
const STEP_MAP = {
  greeting: "s1", 
  purpose: "s2",
  pickup: "s3", 
  destination: "s3",
  budget: "s4",
  prefs: "s5",
  done: "s6"
};

// ── Initial conversation state ───────────────────────────────
let conversationState = {
  userName: "",
  step: "greeting",
  city: "karachi", 
  purposeKey: "",
  pickup: "",
  pickupCoord: null,
  destination: "",
  destCoord: null,
  distance: 0,
  budget: 0,
  prefs: {}
};

// ============================================================
//  LOCATION DROPDOWN LOGIC (FOR 100+ LOCATIONS)
// ============================================================
async function loadLocationList() {
  try {
    const response = await fetch("http://localhost:5000/api/locations");
    const locations = await response.json();
    
    const datalist = document.getElementById("karachi-locations");
    if (!datalist) {
        console.error("❌ HTML Error: Could not find <datalist id='karachi-locations'>");
        return;
    }

    datalist.innerHTML = ""; 
    
    locations.forEach(loc => {
      const option = document.createElement("option");
      option.value = loc; 
      datalist.appendChild(option);
    });
    
    console.log("✅ All " + locations.length + " Karachi locations loaded.");
  } catch (e) { 
    console.error("❌ Connection Error: Backend server might be offline.", e); 
  }
}

window.addEventListener("DOMContentLoaded", loadLocationList);

// ============================================================
//  USER LOGIN LOGIC
// ============================================================
function startChatWithName() {
  const nameInput = document.getElementById("user-name-input");
  const name = nameInput.value.trim();
  
  if (name === "") {
    alert("Please enter your name to start your consultation!");
    return;
  }

  conversationState.userName = name;
  
  document.getElementById("login-screen").style.display = "none";
  const contents = document.querySelectorAll(".chat-content");
  contents.forEach(el => el.style.display = "block");
  
  document.querySelector(".page-header").style.display = "flex";
  document.querySelector(".chat-box").style.display = "block";
  document.querySelector(".page-footer").style.display = "block";

  startConversation();
}

// ============================================================
//  UI HELPERS
// ============================================================
function updateStepBar(step) {
  const cur = STEP_MAP[step] || "s1";
  const idx = STEPS.indexOf(cur);
  STEPS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) {
      if      (i < idx)  el.className = "step done";
      else if (i === idx) el.className = "step active";
      else                el.className = "step";
    }
  });
}

function showTyping() {
  const msgsEl = document.getElementById("msgs");
  const div = document.createElement("div");
  div.className = "msg bot";
  div.id = "typing-indicator";
  div.innerHTML = `
    <div class="msg-avatar bot-av"><i class="ti ti-robot"></i></div>
    <div class="typing"><span></span><span></span><span></span></div>`;
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

function addMessage(role, html) {
  const msgsEl = document.getElementById("msgs");
  const div    = document.createElement("div");
  div.className = `msg ${role}`;

  const avatar = document.createElement("div");
  avatar.className = `msg-avatar ${role === "bot" ? "bot-av" : "usr-av"}`;
  avatar.innerHTML  = role === "bot" 
    ? `<i class="ti ti-robot"></i>` 
    : `<i class="ti ti-user"></i>`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML  = html;

  div.appendChild(avatar);
  div.appendChild(bubble);
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

function setQuickButtons(btns) {
  const container = document.getElementById("qbtns");
  container.innerHTML = "";
  (btns || []).forEach(label => {
    const btn = document.createElement("button");
    btn.className   = "qb";
    btn.textContent = label;
    btn.onclick = () => {
      document.getElementById("inp").value = label;
      sendMessage();
    };
    container.appendChild(btn);
  });
}

function formatReply(text) {
  return text
    .replace(/\n/g, "<br>")
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
}

// ============================================================
//  RECOMMENDATION CARD BUILDER (NO IMAGES)
// ============================================================
function buildRecommendationHTML(recs, dailyKm, verdict) {
  let html = `<b>Hi ${conversationState.userName}!</b> Based on your Karachi route and budget, here are the top choices:<br><br>`;

  recs.forEach((bike, i) => {
    html += `
      <div class="rec-card ${bike.type.toLowerCase()}" style="padding: 15px; margin-bottom: 12px; border-radius: 10px; border: 1px solid #ddd; background: #fff;">
        <div style="font-weight: bold; font-size: 1.1rem; color: #15803d;">${i === 0 ? "⭐ " : ""}${bike.name}</div>
        <p style="font-size: 0.85rem; color: #555; margin: 6px 0;"><i>"${bike.reason}"</i></p>
        <div style="font-size: 0.9rem; color: #444;">${bike.desc}</div>
        
        <div style="margin-top:10px; display: flex; gap: 8px;">
          <span style="background: #e8f5e9; color: #15803d; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600;">${bike.type}</span>
          <span style="background: #f5f5f5; color: #444; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem;">Rs ${(bike.price / 1000).toFixed(0)}k</span>
        </div>
      </div>`;
  });

  return html;
}

// ============================================================
//  SEND MESSAGE & API INTERACTION
// ============================================================
async function sendMessage() {
  const input   = document.getElementById("inp");
  const message = input.value.trim();
  if (!message) return;

  input.value = "";
  setQuickButtons([]);
  addMessage("user", message);
  showTyping();

  try {
    const response = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message, state: conversationState })
    });

    const data = await response.json();
    conversationState = data.state;
    updateStepBar(conversationState.step);
    removeTyping();

    let replyHTML = (data.reply === "recommendations")
      ? buildRecommendationHTML(data.recommendations, data.dailyKm, data.verdict)
      : formatReply(data.reply);

    addMessage("bot", replyHTML);
    setQuickButtons(data.suggestions || []);

  } catch (error) {
    removeTyping();
    addMessage("bot", `⚠️ <b>Server Connection Error</b><br>Please start the backend with 'node server.js'`);
  }
}

async function startConversation() {
  showTyping();
  try {
    const response = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello", state: conversationState })
    });

    const data = await response.json();
    conversationState = data.state;

    removeTyping();
    addMessage("bot", formatReply(data.reply));
    setQuickButtons(data.suggestions || []);
    updateStepBar(conversationState.step);

  } catch (error) {
    removeTyping();
    addMessage("bot", `⚠️ <b>Backend not running</b>`);
  }
}

function resetChat() {
  location.reload(); 
}