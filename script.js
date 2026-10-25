'use strict';

// =====================================================
// 1. Settings, saved progress, and the current project
// =====================================================
// "Produced" is your score. "Wallet" is water you can spend.
// Buying an upgrade reduces the wallet, never the score.
const STORAGE_KEY = 'pump-it-progress';
const FIRST_GOAL = 1000;
const GOAL_INCREASE = 500;
const STREAK_WINDOW = 1.2;
const STREAK_TARGET = 5;
const STREAK_MULTIPLIER = 1.5;
const FILTER_DURATION = 10;
const FILTER_REPAIR_TAPS = 3;

function getElement(id) {
  return document.getElementById(id);
}

let saved = { points: 0, permanent: 0, completed: 0 };
try {
  const storedProgress = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (storedProgress) {
    for (const key of Object.keys(saved)) {
      if (Number.isSafeInteger(storedProgress[key]) && storedProgress[key] >= 0) {
        saved[key] = storedProgress[key];
      }
    }
  }
} catch {
  // Storage may be blocked. The game can still run without saving.
}

let state;
let lastFrameTime = performance.now();
let nextEventTime;
let milestoneQueue = [];
let soundEnabled = false;
let audioContext;

// Upgrade data stays separate from the button-rendering code.
const upgrades = [
  {
    name: 'Better handle',
    description: '+5 water per tap',
    icon: '↗',
    baseCost: 70,
    apply() { state.tap += 5; }
  },
  {
    name: 'Solar pump',
    description: '+8 water per second',
    icon: '☀',
    baseCost: 130,
    apply() { state.auto += 8; }
  },
  {
    name: 'Efficient system',
    description: '+20% to all production',
    icon: '◈',
    baseCost: 210,
    apply() { state.multiplier *= 1.2; }
  }
];

const bonuses = [
  {
    name: 'Community crew',
    description: '+8 water per tap',
    apply() { state.tap += 8; }
  },
  {
    name: 'Steady stream',
    description: '+12 water per second',
    apply() { state.auto += 12; }
  },
  {
    name: 'Smarter pumping',
    description: '+25% to all production',
    apply() { state.multiplier *= 1.25; }
  },
  {
    name: 'Extra supplies',
    description: '+100 spendable water',
    apply() { state.wallet += 100; }
  },
  {
    name: 'Local expertise',
    description: '+4 per tap and +6 per second',
    apply() {
      state.tap += 4;
      state.auto += 6;
    }
  }
];

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    showNotice('Your browser could not save progress. You can still play.');
  }
}

function resetProject() {
  state = {
    mode: 'ready',
    produced: 0,
    wallet: 0,
    goal: FIRST_GOAL + saved.completed * GOAL_INCREASE,
    tap: 10 + saved.permanent * 2,
    auto: 0,
    multiplier: 1,
    elapsed: 0,
    levels: [0, 0, 0],
    milestones: 0,
    bonuses: [],
    eventLeft: 0,
    repairs: 0,
    streak: 0,
    lastTapTime: -Infinity
  };
  nextEventTime = 18 + Math.random() * 8;
  milestoneQueue = [];
  getElement('confetti').replaceChildren();
  render();
}

// =====================================================
// 2. Small helpers: numbers, rates, sound, and menus
// =====================================================
function formatNumber(number) {
  return Math.floor(number).toLocaleString('en-US');
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function productionRate(kind) {
  const filterMultiplier = state.eventLeft > 0 ? 0.5 : 1;
  return state[kind] * state.multiplier * filterMultiplier;
}

function upgradeCost(index) {
  return Math.ceil(upgrades[index].baseCost * Math.pow(1.65, state.levels[index]));
}

function canPlay() {
  return state.mode === 'running' && !getElement('modal').open;
}

function showNotice(message) {
  getElement('notice').textContent = message;
}

// Audio is generated locally, so no sound files or downloads are needed.
// It is off until the player explicitly enables it.
function playTone(frequency = 440, duration = 0.08) {
  if (!soundEnabled || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.7, audioContext.currentTime + duration);
  volume.gain.setValueAtTime(0.05, audioContext.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function openModal(html) {
  getElement('modal-body').innerHTML = html;
  getElement('modal').showModal();
  render();
}

function closeModal() {
  getElement('modal').close();
  lastFrameTime = performance.now();
  render();
}

// Fisher–Yates shuffle gives each bonus an equal chance of appearing.
function randomChoices(items, count) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

// =====================================================
// 3. Drawing the current state on the page
// =====================================================
function render() {
  const percent = Math.min(100, state.produced / state.goal * 100);
  const playable = canPlay();
  const betweenProjects = state.mode === 'ready' || state.mode === 'won';
  const statusLabels = {
    ready: 'READY TO PUMP',
    running: 'WATER IN MOTION',
    paused: 'TAKING A BREAK',
    won: 'PROJECT COMPLETE'
  };
  const controlLabels = {
    ready: 'Start project →',
    running: 'Pause project',
    paused: 'Resume project →',
    won: 'Next project →'
  };

  getElement('score').textContent = formatNumber(state.produced);
  getElement('wallet').textContent = formatNumber(state.wallet);
  getElement('goal').textContent = formatNumber(state.goal);
  getElement('timer').textContent = formatTime(state.elapsed);
  getElement('fill').style.width = `${percent}%`;
  getElement('tank-water').style.height = `${percent}%`;
  getElement('percent').textContent = `${Math.floor(percent)}%`;
  document.querySelector('.progress').setAttribute('aria-valuenow', Math.floor(percent));

  let progressMessage = 'Your first drop is the beginning.';
  if (state.produced > 0) progressMessage = 'Every drop brings your village to life.';
  if (state.mode === 'won') progressMessage = 'Water is flowing. Your village is thriving!';
  getElement('progress-text').textContent = progressMessage;

  const tapRate = Number(productionRate('tap').toFixed(1));
  getElement('tap').textContent = tapRate;
  getElement('tap-button').textContent = tapRate;
  getElement('auto').textContent = Number(productionRate('auto').toFixed(1));
  getElement('points').textContent = saved.points;
  getElement('permanent-level').textContent = `Permanent boost: +${saved.permanent * 2} / tap`;
  getElement('permanent').disabled = saved.points < 1 || !betweenProjects;

  const projectNumber = saved.completed + (state.mode === 'won' ? 0 : 1);
  getElement('project-number').textContent = `PROJECT ${String(projectNumber).padStart(2, '0')}`;
  getElement('project-title').textContent = state.goal === FIRST_GOAL ? 'The first flow' : 'A growing community';
  getElement('status').textContent = statusLabels[state.mode];
  getElement('start').textContent = controlLabels[state.mode];
  getElement('pump').disabled = !playable;

  const streakActive = state.streak >= STREAK_TARGET;
  getElement('combo').textContent = streakActive ? 'GREAT FLOW! ×1.5' : `STREAK · ${state.streak} / ${STREAK_TARGET}`;
  getElement('combo').classList.toggle('active', streakActive);
  document.querySelector('.scene').classList.toggle('flowing', playable && state.auto > 0);
  document.querySelector('.solar-array').classList.toggle('built', state.levels[1] > 0);

  upgrades.forEach((upgrade, index) => {
    const button = getElement(`upgrade-${index}`);
    button.disabled = !playable || state.wallet < upgradeCost(index);
    button.querySelector('.cost').textContent = `${formatNumber(upgradeCost(index))} ◈`;
    button.querySelector('small').textContent = `${upgrade.description} · Lv ${state.levels[index]}`;
    getElement(`mile-${index}`).classList.toggle('done', state.milestones > index);
    document.querySelectorAll('.house')[index].classList.toggle('restored', state.milestones > index);
  });

  getElement('event').hidden = state.eventLeft <= 0;
  getElement('event-time').textContent = Math.ceil(state.eventLeft);
  getElement('repair').textContent = `Clear filter (${state.repairs}/${FILTER_REPAIR_TAPS})`;
  getElement('repair').disabled = !playable;
}

// =====================================================
// 4. Producing water, purchasing upgrades, and milestones
// =====================================================
function addWater(amount) {
  if (state.mode !== 'running') return;
  // Cap both counters at the water actually needed to finish the project.
  const earnedWater = Math.min(amount, state.goal - state.produced);
  state.produced += earnedWater;
  state.wallet += earnedWater;

  while (state.milestones < 3 && state.produced / state.goal >= (state.milestones + 1) * 0.25) {
    state.milestones++;
    milestoneQueue.push(state.milestones);
  }

  if (state.produced >= state.goal) {
    completeProject();
    return;
  }
  if (milestoneQueue.length > 0 && !getElement('modal').open) showBonusChoices();
  render();
}

function pumpWater() {
  if (!canPlay()) return;
  // Active game time keeps streaks fair when the player pauses.
  if (state.elapsed - state.lastTapTime <= STREAK_WINDOW) {
    state.streak = Math.min(STREAK_TARGET, state.streak + 1);
  } else {
    state.streak = 1;
  }
  state.lastTapTime = state.elapsed;
  const streakBonus = state.streak >= STREAK_TARGET ? STREAK_MULTIPLIER : 1;
  const amount = productionRate('tap') * streakBonus;

  const scene = document.querySelector('.scene');
  scene.classList.remove('pumping');
  void scene.offsetWidth; // Restart the short handle animation on each tap.
  scene.classList.add('pumping');
  const floatingText = document.createElement('span');
  floatingText.className = 'floating';
  floatingText.textContent = `+${Number(amount.toFixed(1))}`;
  getElement('floats').append(floatingText);
  setTimeout(() => floatingText.remove(), 850);
  playTone(350 + state.streak * 45);
  addWater(amount);
}

function buyUpgrade(index) {
  const price = upgradeCost(index);
  if (!canPlay() || state.wallet < price) return;
  state.wallet -= price;
  state.levels[index]++;
  upgrades[index].apply();
  playTone(680, 0.16);
  showNotice(`${upgrades[index].name} upgraded!`);
  render();
}

function showBonusChoices() {
  const milestone = milestoneQueue.shift();
  const choices = randomChoices(bonuses, 3);
  const buttons = choices.map((bonus, index) => `
    <button class="choice" data-bonus="${index}">
      <b>${bonus.name}</b>
      <small>${bonus.description}</small>
    </button>
  `).join('');

  openModal(`
    <p class="eyebrow">${milestone * 25}% MILESTONE · TIMER PAUSED</p>
    <h2>Your village is growing!</h2>
    <p>One more home has clean water. Choose a free boost for this project.</p>
    ${buttons}
  `);
  playTone(750, 0.2);

  document.querySelectorAll('[data-bonus]').forEach(button => {
    button.addEventListener('click', () => {
      const bonus = choices[Number(button.dataset.bonus)];
      bonus.apply();
      state.bonuses.push(bonus.name);
      closeModal();
      showNotice(`${bonus.name} activated. Keep the water flowing!`);
      if (milestoneQueue.length > 0) showBonusChoices();
      render();
    });
  });
}

// =====================================================
// 5. Filter challenge and project completion
// =====================================================
function clearFilter() {
  if (!canPlay() || state.eventLeft <= 0) return;
  state.repairs++;
  playTone(240 + state.repairs * 100);
  if (state.repairs === FILTER_REPAIR_TAPS) {
    state.eventLeft = 0;
    showNotice('Filter cleared. Full production restored!');
  }
  render();
}

function celebrate() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ffc907', '#46a7b7', '#193c42', '#e9ac89'];
  for (let index = 0; index < 65; index++) {
    const piece = document.createElement('i');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.7}s`;
    getElement('confetti').append(piece);
  }
  setTimeout(() => getElement('confetti').replaceChildren(), 4000);
}

function completeProject() {
  state.mode = 'won';
  state.eventLeft = 0;
  saved.points++;
  saved.completed++;
  saveProgress();
  milestoneQueue = [];
  const purchases = state.levels.reduce((total, level) => total + level, 0);

  openModal(`
    <div class="result-icon">✦</div>
    <p class="eyebrow">CLEAN WATER IS FLOWING</p>
    <h2>A village brought to life.</h2>
    <p>You produced <b>${formatNumber(state.produced)} water</b>
       in <b>${formatTime(state.elapsed)}</b>.</p>
    <p>${purchases} upgrades purchased · ${state.bonuses.length} milestone bonuses<br>
       <b>+1 knowledge point earned</b></p>
    <p>Spend your knowledge on a permanent tap boost, or take on a bigger project.</p>
    <button class="primary" id="results-close">Back to village →</button>
  `);
  getElement('results-close').addEventListener('click', closeModal);
  celebrate();
  playTone(880, 0.4);
  showNotice('Project complete! You earned 1 knowledge point.');
  render();
}

// =====================================================
// 6. Buttons and keyboard controls
// =====================================================
function togglePlay() {
  if (getElement('modal').open) return;
  if (state.mode === 'won') resetProject();
  state.mode = state.mode === 'running' ? 'paused' : 'running';
  lastFrameTime = performance.now();
  showNotice(state.mode === 'paused' ? 'Project paused. Take your time.' : 'Pump steadily to build a ×1.5 streak bonus!');
  render();
}

function askToRestart() {
  openModal(`
    <h2>Restart this project?</h2>
    <p>This run's water and upgrades will reset. Knowledge points and permanent boosts are kept.</p>
    <button class="primary" id="confirm-reset">Restart project</button>
    <button class="choice" id="cancel-reset">Keep playing</button>
  `);
  getElement('confirm-reset').addEventListener('click', () => {
    closeModal();
    resetProject();
    showNotice('A fresh start. Press Start project when ready.');
  });
  getElement('cancel-reset').addEventListener('click', closeModal);
}

function buyPermanentBoost() {
  if (saved.points < 1 || !['ready', 'won'].includes(state.mode)) return;
  saved.points--;
  saved.permanent++;
  if (state.mode === 'ready') state.tap += 2;
  saveProgress();
  showNotice('Permanent boost purchased: +2 water per tap on future projects.');
  render();
}

function showInstructions() {
  openModal(`
    <p class="eyebrow">YOUR FIELD GUIDE</p>
    <h2>Let's get water flowing.</h2>
    <ol>
      <li>Start your project, then click Pump water or press Space.</li>
      <li>Keep taps within 1.2 seconds. After five taps, each tap earns ×1.5 water. The streak is optional!</li>
      <li>Buy upgrades with available water. Your total score never decreases.</li>
      <li>Choose a free bonus at 25%, 50%, and 75%. Watch the homes light up.</li>
      <li>Clear clogged filters with three taps, or wait 10 seconds. You cannot lose.</li>
      <li>Fill the tank to earn knowledge. Buy permanent boosts between projects.</li>
    </ol>
    <p>Press P to pause. Menus pause the timer; switching tabs pauses the game.
       Knowledge is saved in this browser. Unfinished projects are not.</p>
    <button class="primary" id="help-close">Let's play →</button>
  `);
  getElement('help-close').addEventListener('click', closeModal);
}

// Create each shop button once. render() only updates its values.
upgrades.forEach((upgrade, index) => {
  const button = document.createElement('button');
  button.className = 'upgrade';
  button.id = `upgrade-${index}`;
  button.innerHTML = `
    <span class="icon" aria-hidden="true">${upgrade.icon}</span>
    <span><b>${upgrade.name}</b><small></small></span>
    <span class="cost"></span>
  `;
  button.addEventListener('click', () => buyUpgrade(index));
  getElement('upgrades').append(button);
});

getElement('pump').addEventListener('click', pumpWater);
getElement('start').addEventListener('click', togglePlay);
getElement('restart').addEventListener('click', askToRestart);
getElement('repair').addEventListener('click', clearFilter);
getElement('permanent').addEventListener('click', buyPermanentBoost);
getElement('help').addEventListener('click', showInstructions);
getElement('sound').addEventListener('click', async () => {
  try {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioClass) throw new Error('Audio unavailable');
    if (!audioContext) audioContext = new AudioClass();
    await audioContext.resume();
    soundEnabled = !soundEnabled;
    getElement('sound').textContent = soundEnabled ? 'Sound on' : 'Sound off';
    getElement('sound').setAttribute('aria-pressed', String(soundEnabled));
    playTone(600);
  } catch {
    showNotice('Sound is unavailable in this browser. Gameplay still works.');
  }
});

getElement('modal').addEventListener('cancel', event => {
  event.preventDefault();
  // Milestone menus require one choice. Other menus may close with Escape.
  if (!document.querySelector('[data-bonus]')) closeModal();
});

document.addEventListener('keydown', event => {
  if (getElement('modal').open || event.repeat) return;
  const tagName = document.activeElement.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return;
  if (event.code === 'Space') {
    // Let focused buttons/links keep their normal keyboard behavior.
    if (['BUTTON', 'A'].includes(tagName)) return;
    event.preventDefault();
    pumpWater();
  }
  if (event.code === 'KeyP') {
    event.preventDefault();
    togglePlay();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'running') {
    state.mode = 'paused';
    showNotice('Project paused while you were away.');
    render();
  }
  lastFrameTime = performance.now();
});

// =====================================================
// 7. The game loop
// =====================================================
// requestAnimationFrame supplies a timestamp. The difference between frames
// is "delta time", so automatic production is independent of frame rate.
function gameLoop(now) {
  const deltaTime = Math.max(0, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  if (canPlay()) {
    state.elapsed += deltaTime;
    if (state.elapsed - state.lastTapTime > STREAK_WINDOW) state.streak = 0;

    // Apply a clog only for the part of this frame during which it exists.
    const cloggedTime = Math.min(state.eventLeft, deltaTime);
    if (state.eventLeft > 0) {
      state.eventLeft = Math.max(0, state.eventLeft - deltaTime);
      if (state.eventLeft === 0) showNotice('Filter cleared itself. Full production restored.');
    }
    if (state.auto > 0) {
      const productiveTime = deltaTime - cloggedTime * 0.5;
      addWater(state.auto * state.multiplier * productiveTime);
    }
    if (canPlay() && state.elapsed >= nextEventTime) {
      state.eventLeft = FILTER_DURATION;
      state.repairs = 0;
      nextEventTime = state.elapsed + 30 + Math.random() * 15;
      showNotice('A clogged filter is slowing production. Clear it with three taps.');
    }
    render();
  }
  requestAnimationFrame(gameLoop);
}

resetProject();
requestAnimationFrame(gameLoop);
