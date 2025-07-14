// --- State Variables ---
let mode = null; // 'simple' or 'hard'
let enableAudio = true, enableVisual = true, rounds = 4;
let currentRound = 0, reactionTimes = [], cueTypeList = [];
let awaitingCue = false, cueShown = false, cueStartTime = 0;
let hardAlphabet = '';
let highscoreSimple = localStorage.getItem('rtt_highscore_simple') || null;
let highscoreHard = localStorage.getItem('rtt_highscore_hard') || null;

// --- DOM Elements ---
const modeSelect = document.querySelector('.mode-select');
const settingsForm = document.getElementById('settingsForm');
const simpleSettings = document.getElementById('simpleSettings');
const gameArea = document.getElementById('gameArea');
const cueBox = document.getElementById('cueBox');
const info = document.getElementById('info');
const resultsArea = document.getElementById('resultsArea');
const resultsTable = document.getElementById('resultsTable');
const avgResult = document.getElementById('avgResult');
const highscoreDisplay = document.getElementById('highscoreDisplay');
const audioBeep = document.getElementById('audioBeep');

// --- Mode Selection ---
function selectMode(selectedMode) {
  mode = selectedMode;
  modeSelect.classList.add('hidden');
  settingsForm.classList.remove('hidden');
  if (mode === 'simple') {
    simpleSettings.classList.remove('hidden');
  } else {
    simpleSettings.classList.add('hidden');
  }
}
function backToModeSelect() {
  settingsForm.classList.add('hidden');
  gameArea.classList.add('hidden');
  resultsArea.classList.add('hidden');
  modeSelect.classList.remove('hidden');
  info.textContent = '';
}

// --- Settings Form ---
settingsForm.onsubmit = function(e) {
  e.preventDefault();
  enableAudio = mode === 'simple' ? document.getElementById('audioCue').checked : false;
  enableVisual = mode === 'simple' ? document.getElementById('visualCue').checked : true;
  rounds = Math.max(1, Math.min(10, parseInt(document.getElementById('rounds').value) || 4));
  startGame();
};

// --- Game Logic ---
function startGame() {
  currentRound = 0;
  reactionTimes = [];
  cueTypeList = [];
  settingsForm.classList.add('hidden');
  resultsArea.classList.add('hidden');
  gameArea.classList.remove('hidden');
  info.textContent = '';
  nextRound();
}

function nextRound() {
  cueBox.className = 'cue' + (mode === 'hard' ? ' hard' : '');
  cueBox.innerHTML = '';
  cueBox.style.background = mode === 'hard' ? '#000' : '#333';
  cueBox.style.cursor = 'default';
  info.textContent = `Round ${currentRound + 1} of ${rounds}`;
  awaitingCue = true;
  cueShown = false;
  let delay = 900 + Math.random() * 2200; // 0.9-3.1s
  setTimeout(showCue, delay);
  // Listen for early input
  if (mode === 'simple') {
    window.onkeydown = (e) => {
      if (e.code === 'Space' && awaitingCue && !cueShown) earlyInput();
    };
    cueBox.ontouchstart = (e) => {
      if (awaitingCue && !cueShown) earlyInput();
    };
  } else {
    window.onkeydown = null;
    cueBox.ontouchstart = null;
  }
}

function showCue() {
  if (!awaitingCue) return;
  cueShown = true;

  if (mode === 'simple') {
    let cueType = '';
    if (enableVisual && enableAudio) {
      cueType = Math.random() < 0.5 ? 'Audio' : 'Visual';
    } else if (enableAudio) {
      cueType = 'Audio';
    } else if (enableVisual) {
      cueType = 'Visual';
    }
    cueTypeList.push(cueType);

    if (cueType === 'Visual') {
      cueBox.classList.add('active');
      cueBox.textContent = 'PRESS!';
      cueBox.style.color = '#ffe066';
      cueStartTime = performance.now(); // Visual cue is instant
      cueBox.style.cursor = 'pointer';
      // Input listeners
      window.onkeydown = (e) => {
        if (e.code === 'Space' && cueShown) registerReaction();
      };
      cueBox.ontouchstart = (e) => {
        if (cueShown) registerReaction();
      };
    } else if (cueType === 'Audio') {
      // Preload and reset audio
      audioBeep.currentTime = 0;
      // Wait for the sound to actually start playing
      audioBeep.onplaying = () => {
        cueStartTime = performance.now(); // Start timer exactly when audio starts
        audioBeep.onplaying = null; // Remove handler
      };
      audioBeep.play();
      cueBox.style.cursor = 'pointer';
      window.onkeydown = (e) => {
        if (e.code === 'Space' && cueShown) registerReaction();
      };
      cueBox.ontouchstart = (e) => {
        if (cueShown) registerReaction();
      };
    }
  } else {
    // Hard mode
    if (isMobile()) {
      cueTypeList.push('Yellow Dot');
      cueBox.innerHTML = '';
      let dot = document.createElement('div');
      dot.className = 'yellow-dot';
      let boxRect = cueBox.getBoundingClientRect();
      let maxLeft = cueBox.offsetWidth - dot.offsetWidth;
      let maxTop = cueBox.offsetHeight - dot.offsetHeight;
      dot.style.left = Math.random() * maxLeft + 'px';
      dot.style.top = Math.random() * maxTop + 'px';
      dot.style.position = 'absolute';
      dot.ontouchstart = registerReaction;
      cueBox.appendChild(dot);
      cueStartTime = performance.now();
    } else {
      hardAlphabet = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      cueTypeList.push(`Key: ${hardAlphabet}`);
      cueBox.textContent = hardAlphabet;
      cueBox.style.color = '#ffe066';
      window.onkeydown = (e) => {
        if (cueShown && e.key.toUpperCase() === hardAlphabet) registerReaction();
      };
      cueStartTime = performance.now();
    }
  }
}

function registerReaction() {
  if (!cueShown) return;
  // If cueStartTime is not set (e.g., user pressed before audio started), ignore
  if (!cueStartTime) return;
  let reaction = Math.round(performance.now() - cueStartTime);
  reactionTimes.push(reaction);
  cueShown = false;
  awaitingCue = false;
  cueBox.className = 'cue' + (mode === 'hard' ? ' hard' : '');
  cueBox.textContent = '';
  cueBox.innerHTML = '';
  cueBox.style.background = mode === 'hard' ? '#000' : '#333';
  cueBox.style.cursor = 'default';
  window.onkeydown = null;
  cueBox.ontouchstart = null;
  cueStartTime = 0;
  setTimeout(() => {
    currentRound++;
    if (currentRound < rounds) {
      nextRound();
    } else {
      showResults();
    }
  }, 600);
}

function earlyInput() {
  awaitingCue = false;
  cueShown = false;
  cueStartTime = 0;
  info.textContent = 'Too soon! Wait for the cue.';
  cueBox.className = 'cue';
  cueBox.textContent = '';
  window.onkeydown = null;
  cueBox.ontouchstart = null;
  setTimeout(nextRound, 1200);
}

// --- Results ---
function showResults() {
  gameArea.classList.add('hidden');
  resultsArea.classList.remove('hidden');
  // Build table
  let html = `<tr><th>Round</th><th>Cue</th><th>Reaction (ms)</th></tr>`;
  for (let i = 0; i < reactionTimes.length; i++) {
    html += `<tr><td>${i + 1}</td><td>${cueTypeList[i]}</td><td>${reactionTimes[i]}</td></tr>`;
  }
  resultsTable.innerHTML = html;
  let avg = Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length);
  avgResult.innerHTML = `<b>Average Reaction Time:</b> ${avg} ms`;
  // Highscore logic
  let hsKey = mode === 'simple' ? 'rtt_highscore_simple' : 'rtt_highscore_hard';
  let prevHS = mode === 'simple' ? highscoreSimple : highscoreHard;
  let newHS = false;
  if (!prevHS || avg < prevHS) {
    localStorage.setItem(hsKey, avg);
    if (mode === 'simple') highscoreSimple = avg;
    else highscoreHard = avg;
    newHS = true;
  }
  let hsDisplay = `<b>High Score (${mode === 'simple' ? 'Simple' : 'Hard'}):</b> <span class="highscore">${localStorage.getItem(hsKey)} ms</span>`;
  if (newHS) hsDisplay += ' <span style="color:#43ea5e;">(New!)</span>';
  highscoreDisplay.innerHTML = hsDisplay;
}

function restartGame() {
  resultsArea.classList.add('hidden');
  settingsForm.classList.remove('hidden');
}

// --- Helpers ---
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// --- On Load: Show Highscores if present, Preload Audio ---
window.onload = function() {
  if (highscoreSimple)
    highscoreDisplay.innerHTML = `<b>High Score (Simple):</b> <span class="highscore">${highscoreSimple} ms</span>`;
  if (highscoreHard)
    highscoreDisplay.innerHTML += `<br><b>High Score (Hard):</b> <span class="highscore">${highscoreHard} ms</span>`;
  // Preload audio
  if (audioBeep) {
    audioBeep.load();
  }
};
