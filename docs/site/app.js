const STORAGE_KEY = 'opennutri-web-state-v1';
const defaultState = {
  consumed: 1272,
  carbs: 142,
  protein: 81,
  fat: 42,
  meal: 'dinner',
  weekOffset: 0,
  foods: [],
  dark: false,
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved && typeof saved === 'object' ? { ...defaultState, ...saved } : { ...defaultState };
  } catch {
    return { ...defaultState };
  }
}

const state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const views = {
  home: ['今天吃得怎么样？', '2026年7月14日 · 星期二'],
  diary: ['饮食日记', '最近 7 天 · 营养趋势'],
  recipes: ['我的食谱', '4 个常用食谱 · 随时记录'],
  profile: ['个人资料', '目标、身体指标与设置'],
};
const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '零食' };

function setView(name) {
  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('active', el.id === `view-${name}`));
  document.querySelectorAll('[data-view]').forEach((el) => el.classList.toggle('active', el.dataset.view === name));
  document.getElementById('page-title').textContent = views[name][0];
  document.getElementById('date-eyebrow').textContent = views[name][1];
  window.scrollTo({ top: 0, behavior: 'smooth' });
  history.replaceState(null, '', `#${name}`);
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

function renderDays() {
  const labels = ['一', '二', '三', '四', '五', '六', '日'];
  const base = 13 + state.weekOffset * 7;
  document.getElementById('days').innerHTML = labels.map((label, index) => {
    const date = base + index;
    const active = state.weekOffset === 0 && date === 14;
    return `<button class="day ${active ? 'active' : ''}" data-date="${date}"><span>周${label}</span><b>${date}</b></button>`;
  }).join('');
  document.querySelectorAll('.day').forEach((day) => day.addEventListener('click', () => {
    document.querySelectorAll('.day').forEach((item) => item.classList.remove('active'));
    day.classList.add('active');
    document.getElementById('date-eyebrow').textContent = `2026年7月${day.dataset.date}日 · 饮食记录`;
  }));
}
document.getElementById('prev-week').addEventListener('click', () => { state.weekOffset -= 1; renderDays(); });
document.getElementById('next-week').addEventListener('click', () => { state.weekOffset += 1; renderDays(); });
renderDays();

const dialog = document.getElementById('add-dialog');
document.querySelectorAll('[data-open-add]').forEach((button) => {
  button.addEventListener('click', () => {
    state.meal = button.dataset.mealTarget || 'dinner';
    document.getElementById('meal-name').textContent = mealNames[state.meal];
    dialog.showModal();
  });
});

document.querySelectorAll('[data-add-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('[data-add-tab]').forEach((item) => item.classList.toggle('active', item === tab));
    document.querySelectorAll('.add-panel').forEach((panel) => panel.classList.remove('active'));
    document.getElementById(`add-${tab.dataset.addTab}-panel`).classList.add('active');
  });
});

function addFood(food) {
  const kcal = Number(food.kcal || 0);
  state.consumed += kcal;
  state.carbs += Number(food.carbs || 0);
  state.protein += Number(food.protein || 0);
  state.fat += Number(food.fat || 0);

  const savedFood = {
    name: String(food.name || '快捷记录'),
    kcal,
    carbs: Number(food.carbs || 0),
    protein: Number(food.protein || 0),
    fat: Number(food.fat || 0),
    meal: state.meal,
  };
  state.foods.push(savedFood);
  appendFoodRow(savedFood, true);
  saveState();
  updateDashboard();
  dialog.close();
  showToast(`${savedFood.name} 已保存到${mealNames[state.meal]}`);
}

function appendFoodRow(food, updateMealTotal = false) {
  const card = document.querySelector(`[data-meal="${food.meal}"]`);
  if (!card) return;
  const current = Number(card.querySelector('[data-meal-kcal]').textContent.replace(/,/g, ''));
  card.querySelector('[data-meal-kcal]').textContent = (current + Number(food.kcal || 0)).toLocaleString('zh-CN');
  card.classList.remove('muted');
  const empty = card.querySelector('.empty-meal');
  if (empty) {
    const list = document.createElement('div');
    list.className = 'food-list';
    empty.replaceWith(list);
  }
  const list = card.querySelector('.food-list');
  const row = document.createElement('div');
  row.className = 'food-item';
  const emoji = document.createElement('span');
  emoji.className = 'food-emoji';
  emoji.textContent = '🍴';
  const details = document.createElement('span');
  const name = document.createElement('strong');
  name.textContent = food.name;
  const note = document.createElement('small');
  note.textContent = updateMealTotal ? '刚刚添加 · 1 份' : '已保存在本机 · 1 份';
  details.append(name, note);
  const energy = document.createElement('b');
  energy.textContent = Number(food.kcal || 0).toLocaleString('zh-CN');
  row.append(emoji, details, energy);
  list.appendChild(row);
}

document.querySelectorAll('.result-item').forEach((item) => item.addEventListener('click', () => addFood({
  name: item.dataset.food,
  kcal: item.dataset.kcal,
  carbs: item.dataset.carbs,
  protein: item.dataset.protein,
  fat: item.dataset.fat,
})));

document.getElementById('quick-submit').addEventListener('click', () => {
  const name = document.getElementById('quick-name').value.trim() || '快捷记录';
  const kcal = Number(document.getElementById('quick-kcal').value);
  if (!kcal) {
    document.getElementById('quick-kcal').focus();
    return;
  }
  addFood({
    name,
    kcal,
    protein: document.getElementById('quick-protein').value,
    carbs: document.getElementById('quick-carbs').value,
    fat: document.getElementById('quick-fat').value,
  });
  document.querySelectorAll('#add-quick-panel input').forEach((input) => { input.value = ''; });
});

function updateDashboard() {
  const remaining = Math.max(0, 2000 - state.consumed);
  const percentage = Math.min(100, Math.round(state.consumed / 2000 * 100));
  document.getElementById('consumed-kcal').textContent = state.consumed.toLocaleString('zh-CN');
  document.getElementById('remaining-kcal').textContent = remaining.toLocaleString('zh-CN');
  document.getElementById('suggestion-kcal').textContent = `${remaining.toLocaleString('zh-CN')} 千卡`;
  document.getElementById('calorie-ring').style.setProperty('--progress', `${percentage}%`);
  [['carbs', 250], ['protein', 120], ['fat', 67]].forEach(([key, goal]) => {
    const percent = Math.min(100, Math.round(state[key] / goal * 100));
    document.getElementById(`${key}-value`).textContent = state[key];
    document.getElementById(`${key}-percent`).textContent = `${percent}%`;
    document.getElementById(`${key}-bar`).style.width = `${percent}%`;
  });
}

let toastTimer;
function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.getElementById('theme-toggle').addEventListener('click', (event) => {
  document.body.classList.toggle('dark');
  state.dark = document.body.classList.contains('dark');
  saveState();
  event.currentTarget.textContent = document.body.classList.contains('dark') ? '☀' : '☾';
});

document.querySelectorAll('.segmented button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.segmented button').forEach((item) => item.classList.toggle('active', item === button));
}));

document.getElementById('recipe-search').addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.recipe-card').forEach((card) => {
    card.hidden = !card.dataset.name.toLowerCase().includes(query);
  });
});

document.getElementById('food-search').addEventListener('input', (event) => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.result-item').forEach((item) => {
    item.hidden = !item.dataset.food.toLowerCase().includes(query);
  });
});

const initialView = location.hash.slice(1);
if (views[initialView]) setView(initialView);

state.foods.forEach((food) => appendFoodRow(food));
if (state.dark) {
  document.body.classList.add('dark');
  document.getElementById('theme-toggle').textContent = '☀';
}
updateDashboard();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}
