const STORAGE_KEY = 'opennutri-personal-v2';
function localDateKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
const todayISO = () => localDateKey();
const emptyState = () => ({
  version: 2,
  initialized: false,
  profile: { name: '', birthDate: '', gender: '', height: null, targetWeight: null },
  goals: { kcal: null, carbs: null, protein: null, fat: null },
  settings: { theme: 'system', energyUnit: 'kcal', measurement: 'metric' },
  foods: [],
  weights: [],
  recipes: [],
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.version === 2 ? saved : emptyState();
  } catch {
    return emptyState();
  }
}

let state = loadState();
let selectedMeal = 'breakfast';
const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '零食' };
const mealIcons = { breakfast: '☀', lunch: '☁', dinner: '☾', snack: '✦' };
const views = {
  home: ['我的一天', '今天'],
  diary: ['趋势与营养', '最近 7 天'],
  recipes: ['我的食谱', '常用组合'],
  profile: ['我的资料', '档案与设置'],
};
const foodDatabase = [
  { name: '鸡蛋', emoji: '🥚', kcal: 78, protein: 6.3, carbs: 0.6, fat: 5.3, serving: '1 个' },
  { name: '香蕉', emoji: '🍌', kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, serving: '1 根' },
  { name: '白米饭', emoji: '🍚', kcal: 232, protein: 4.3, carbs: 50, fat: 0.5, serving: '1 碗（180 克）' },
  { name: '鸡胸肉', emoji: '🍗', kcal: 248, protein: 46, carbs: 0, fat: 6, serving: '180 克' },
  { name: '全脂牛奶', emoji: '🥛', kcal: 153, protein: 8, carbs: 12, fat: 8, serving: '250 毫升' },
  { name: '燕麦片', emoji: '🥣', kcal: 190, protein: 6.5, carbs: 32, fat: 3.5, serving: '50 克' },
  { name: '苹果', emoji: '🍎', kcal: 95, protein: 0.5, carbs: 25, fat: 0.3, serving: '1 个' },
  { name: '西兰花', emoji: '🥦', kcal: 85, protein: 7, carbs: 17, fat: 1, serving: '250 克' },
];

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: digits });
}

function displayEnergy(kcal, withUnit = true) {
  const isKj = state.settings.energyUnit === 'kj';
  const value = isKj ? number(kcal) * 4.184 : number(kcal);
  return `${formatNumber(value)}${withUnit ? ` ${isKj ? '千焦' : '千卡'}` : ''}`;
}

function displayWeight(kg) {
  if (!kg) return '—';
  return state.settings.measurement === 'imperial'
    ? `${formatNumber(number(kg) * 2.20462, 1)} 磅`
    : `${formatNumber(kg, 1)} 公斤`;
}

function applyTheme() {
  const dark = state.settings.theme === 'dark' || (state.settings.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.body.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]').content = dark ? '#101411' : '#167a49';
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-message').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(dialog) {
  if (dialog?.open && !dialog.hasAttribute('data-static')) dialog.close();
}

document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
document.querySelectorAll('dialog:not([data-static])').forEach((dialog) => dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
}));

function setView(name) {
  if (!views[name]) return;
  document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === `view-${name}`));
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
  document.getElementById('page-title').textContent = views[name][0];
  document.getElementById('page-eyebrow').textContent = views[name][1];
  history.replaceState(null, '', `#${name}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', (event) => {
  event.preventDefault();
  setView(button.dataset.view);
}));

function totalsForDate(date) {
  return state.foods.filter((food) => food.date === date).reduce((totals, food) => ({
    kcal: totals.kcal + number(food.kcal),
    protein: totals.protein + number(food.protein),
    carbs: totals.carbs + number(food.carbs),
    fat: totals.fat + number(food.fat),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

function renderHeaderDate() {
  const now = new Date();
  document.getElementById('today-weekday').textContent = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now);
  document.getElementById('today-date').textContent = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(now);
}

function renderDashboard() {
  const totals = totalsForDate(todayISO());
  const goal = number(state.goals.kcal);
  const remaining = Math.max(0, goal - totals.kcal);
  const percent = goal ? Math.min(100, Math.round(totals.kcal / goal * 100)) : 0;
  document.getElementById('remaining-energy').textContent = goal ? displayEnergy(remaining, false) : '—';
  document.getElementById('remaining-label').textContent = goal ? `${state.settings.energyUnit === 'kj' ? '千焦' : '千卡'}剩余` : '待设置目标';
  document.getElementById('consumed-energy').textContent = displayEnergy(totals.kcal);
  document.getElementById('goal-energy').textContent = goal ? displayEnergy(goal) : '未设置';
  document.getElementById('energy-ring').style.setProperty('--progress', `${percent}%`);

  const macroData = [
    ['carbs', '碳水化合物', 'C', '#d79a51'],
    ['protein', '蛋白质', 'P', '#20a663'],
    ['fat', '脂肪', 'F', '#8069c7'],
  ];
  document.getElementById('macro-list').innerHTML = macroData.map(([key, label, letter, color]) => {
    const macroGoal = number(state.goals[key]);
    const value = totals[key];
    const macroPercent = macroGoal ? Math.min(100, Math.round(value / macroGoal * 100)) : 0;
    return `<div class="macro-row"><div class="macro-label"><span class="macro-icon" style="--macro-color:${color}">${letter}</span><span>${label}<small>${formatNumber(value, 1)} / ${macroGoal ? formatNumber(macroGoal) : '—'} 克</small></span><strong>${macroGoal ? `${macroPercent}%` : '—'}</strong></div><div class="progress"><i style="width:${macroPercent}%;background:${color}"></i></div></div>`;
  }).join('');
}

function foodRow(food) {
  const row = document.createElement('div');
  row.className = 'food-item';
  const icon = document.createElement('span');
  icon.className = 'food-emoji';
  icon.textContent = food.emoji || '🍴';
  const detail = document.createElement('span');
  const title = document.createElement('strong');
  title.textContent = food.name;
  const meta = document.createElement('small');
  meta.textContent = `${formatNumber(food.protein, 1)}g 蛋白质 · ${formatNumber(food.carbs, 1)}g 碳水 · ${formatNumber(food.fat, 1)}g 脂肪`;
  detail.append(title, meta);
  const kcal = document.createElement('b');
  kcal.textContent = displayEnergy(food.kcal);
  const remove = document.createElement('button');
  remove.className = 'delete-row';
  remove.type = 'button';
  remove.setAttribute('aria-label', `删除${food.name}`);
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    state.foods = state.foods.filter((item) => item.id !== food.id);
    saveState();
    renderAll();
    showToast('记录已删除');
  });
  row.append(icon, detail, kcal, remove);
  return row;
}

function renderMeals() {
  const grid = document.getElementById('meal-grid');
  grid.innerHTML = '';
  Object.keys(mealNames).forEach((meal) => {
    const foods = state.foods.filter((food) => food.date === todayISO() && food.meal === meal);
    const kcal = foods.reduce((sum, food) => sum + number(food.kcal), 0);
    const card = document.createElement('article');
    card.className = 'meal-card';
    card.innerHTML = `<header><div><span class="meal-emoji ${meal}">${mealIcons[meal]}</span><span><strong>${mealNames[meal]}</strong><small>${foods.length ? `${foods.length} 项记录` : '尚未记录'}</small></span></div><b>${displayEnergy(kcal)}</b></header>`;
    const list = document.createElement('div');
    list.className = foods.length ? 'food-list' : 'empty-meal';
    if (foods.length) foods.forEach((food) => list.append(foodRow(food)));
    else list.innerHTML = '<span>🍽</span><p>这里还是空的<small>点击下方按钮记录食物</small></p>';
    const add = document.createElement('button');
    add.className = 'meal-add';
    add.type = 'button';
    add.textContent = `＋ 添加到${mealNames[meal]}`;
    add.addEventListener('click', () => openAdd(meal));
    card.append(list, add);
    grid.append(card);
  });
}

function renderWeek() {
  const container = document.getElementById('week-bars');
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const iso = localDateKey(date);
    return { date, iso, kcal: totalsForDate(iso).kcal };
  });
  const max = Math.max(number(state.goals.kcal), ...days.map((day) => day.kcal), 1);
  const recorded = days.filter((day) => day.kcal > 0);
  const average = recorded.length ? recorded.reduce((sum, day) => sum + day.kcal, 0) / recorded.length : 0;
  document.getElementById('week-average').textContent = recorded.length ? `平均 ${displayEnergy(average)}` : '暂无记录';
  container.innerHTML = days.map((day, index) => `<div class="${index === 6 ? 'today' : ''}"><span class="bar-value">${day.kcal ? formatNumber(day.kcal) : ''}</span><i style="height:${day.kcal ? Math.max(8, day.kcal / max * 100) : 3}%"></i><span>${new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(day.date).replace('周', '')}</span></div>`).join('');
}

function renderNutrients() {
  const totals = totalsForDate(todayISO());
  const nutrients = [
    ['蛋白质', totals.protein, state.goals.protein, '克', 'P'],
    ['碳水化合物', totals.carbs, state.goals.carbs, '克', 'C'],
    ['脂肪', totals.fat, state.goals.fat, '克', 'F'],
    ['已记录食物', state.foods.filter((food) => food.date === todayISO()).length, null, '项', '✓'],
  ];
  document.getElementById('nutrient-grid').innerHTML = nutrients.map(([name, value, goal, unit, icon]) => {
    const percent = goal ? Math.min(100, Math.round(number(value) / number(goal) * 100)) : 0;
    return `<article class="nutrient-card"><span>${icon}</span><div><strong>${name}</strong><small>${formatNumber(value, 1)}${unit}${goal ? ` / ${formatNumber(goal)}${unit}` : ''}</small>${goal ? `<div class="progress"><i style="width:${percent}%"></i></div>` : ''}</div><b>${goal ? `${percent}%` : ''}</b></article>`;
  }).join('');
}

function renderWeightChart() {
  const chart = document.getElementById('weight-chart');
  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const summary = document.getElementById('weight-summary');
  const history = document.getElementById('weight-history');
  history.innerHTML = '';
  if (!weights.length) {
    chart.className = 'weight-chart empty-chart';
    chart.innerHTML = '<div><span>⚖</span><strong>还没有体重记录</strong><small>添加第一次体重后，这里会显示趋势</small></div>';
    summary.innerHTML = '';
    return;
  }
  const recent = weights.slice(-12);
  const values = recent.map((item) => item.weight);
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const range = Math.max(1, max - min);
  const points = recent.map((item, index) => {
    const x = recent.length === 1 ? 50 : 7 + index / (recent.length - 1) * 86;
    const y = 88 - (item.weight - min) / range * 70;
    return { x, y, item };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  chart.className = 'weight-chart';
  chart.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="体重趋势图"><line x1="5" y1="88" x2="95" y2="88" class="chart-axis"/><polyline points="${polyline}" class="chart-line"/>${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="2.2" class="chart-dot"/>`).join('')}</svg><div class="chart-labels"><span>${recent[0].date.slice(5)}</span><span>${recent.at(-1).date.slice(5)}</span></div>`;
  const first = weights[0].weight;
  const latest = weights.at(-1).weight;
  const change = latest - first;
  summary.innerHTML = `<p><span>最新体重</span><strong>${displayWeight(latest)}</strong></p><p><span>总变化</span><strong>${change > 0 ? '+' : ''}${formatNumber(state.settings.measurement === 'imperial' ? change * 2.20462 : change, 1)} ${state.settings.measurement === 'imperial' ? '磅' : '公斤'}</strong></p><p><span>记录次数</span><strong>${weights.length}</strong></p>`;
  [...weights].reverse().forEach((item) => {
    const row = document.createElement('div');
    row.innerHTML = `<span>${item.date}</span><strong>${displayWeight(item.weight)}</strong>`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '删除';
    remove.addEventListener('click', () => {
      state.weights = state.weights.filter((weight) => weight.id !== item.id);
      saveState();
      renderAll();
    });
    row.append(remove);
    history.append(row);
  });
}

function ageFromBirthDate(value) {
  if (!value) return null;
  const birth = new Date(`${value}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function renderProfile() {
  const latestWeight = [...state.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight;
  const height = number(state.profile.height);
  const bmi = latestWeight && height ? latestWeight / ((height / 100) ** 2) : null;
  const bmiLabel = !bmi ? 'BMI' : bmi < 18.5 ? '偏低' : bmi < 25 ? '正常' : bmi < 30 ? '偏高' : '较高';
  const name = state.profile.name || '尚未填写';
  document.getElementById('profile-name').textContent = name;
  document.getElementById('profile-avatar').textContent = name === '尚未填写' ? '我' : [...name][0].toUpperCase();
  document.getElementById('profile-subtitle').textContent = state.weights.length ? `已记录 ${state.weights.length} 次体重` : '还没有体重记录';
  document.getElementById('bmi-value').textContent = bmi ? formatNumber(bmi, 1) : '—';
  document.getElementById('bmi-label').textContent = bmiLabel;
  document.getElementById('display-weight').textContent = displayWeight(latestWeight);
  document.getElementById('display-height').textContent = height ? (state.settings.measurement === 'imperial' ? `${formatNumber(height / 2.54, 1)} 英寸` : `${formatNumber(height, 1)} 厘米`) : '—';
  const age = ageFromBirthDate(state.profile.birthDate);
  document.getElementById('display-age').textContent = age == null ? '—' : `${age} 岁`;
  const target = number(state.profile.targetWeight);
  document.getElementById('goal-title').textContent = target ? `目标 ${displayWeight(target)}` : '尚未设置';
  document.getElementById('goal-description').textContent = target && latestWeight ? `距离目标 ${displayWeight(Math.abs(latestWeight - target))}` : '编辑个人档案，填写你的目标体重';
  document.getElementById('goal-setting-summary').textContent = state.goals.kcal ? `${displayEnergy(state.goals.kcal)} · 蛋白质 ${formatNumber(state.goals.protein)} 克` : '设置热量和三大营养素';
  const themeNames = { system: '跟随系统', light: '浅色', dark: '深色' };
  document.getElementById('appearance-summary').textContent = `${themeNames[state.settings.theme]} · ${state.settings.energyUnit === 'kj' ? '千焦' : '千卡'} · ${state.settings.measurement === 'imperial' ? '英制' : '公制'}`;
}

function renderRecipes() {
  const grid = document.getElementById('recipe-grid');
  grid.innerHTML = '';
  document.getElementById('recipe-empty').hidden = state.recipes.length > 0;
  state.recipes.forEach((recipe) => {
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.innerHTML = `<div class="recipe-visual">🥣</div><div><span class="label">我的食谱</span><h3></h3><p>${displayEnergy(recipe.kcal)} · 蛋白质 ${formatNumber(recipe.protein, 1)} 克</p><div class="recipe-actions"><button type="button" class="use-recipe">记录这份</button><button type="button" class="delete-recipe">删除</button></div></div>`;
    card.querySelector('h3').textContent = recipe.name;
    card.querySelector('.use-recipe').addEventListener('click', () => {
      selectedMeal = 'breakfast';
      addFood({ ...recipe, emoji: '🥣' });
      setView('home');
    });
    card.querySelector('.delete-recipe').addEventListener('click', () => {
      state.recipes = state.recipes.filter((item) => item.id !== recipe.id);
      saveState();
      renderRecipes();
    });
    grid.append(card);
  });
}

function renderAll() {
  applyTheme();
  renderHeaderDate();
  renderDashboard();
  renderMeals();
  renderWeek();
  renderNutrients();
  renderWeightChart();
  renderProfile();
  renderRecipes();
}

function openAdd(meal = 'breakfast') {
  selectedMeal = meal;
  document.getElementById('meal-select').value = meal;
  document.getElementById('meal-name').textContent = mealNames[meal];
  openDialog('add-dialog');
}

document.getElementById('meal-select').addEventListener('change', (event) => {
  selectedMeal = event.target.value;
  document.getElementById('meal-name').textContent = mealNames[selectedMeal];
});

document.querySelectorAll('[data-open-add]').forEach((button) => button.addEventListener('click', () => openAdd('breakfast')));
document.querySelectorAll('[data-add-tab]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-add-tab]').forEach((tab) => tab.classList.toggle('active', tab === button));
  document.querySelectorAll('.add-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `add-${button.dataset.addTab}-panel`));
}));

function addFood(food) {
  state.foods.push({
    id: crypto.randomUUID(),
    date: todayISO(),
    meal: selectedMeal,
    name: String(food.name || '未命名食物'),
    emoji: food.emoji || '🍴',
    kcal: number(food.kcal),
    protein: number(food.protein),
    carbs: number(food.carbs),
    fat: number(food.fat),
  });
  saveState();
  renderAll();
  document.getElementById('add-dialog').close();
  showToast(`已添加到${mealNames[selectedMeal]}`);
}

document.getElementById('add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  addFood({
    name: document.getElementById('quick-name').value.trim(),
    kcal: document.getElementById('quick-kcal').value,
    protein: document.getElementById('quick-protein').value,
    carbs: document.getElementById('quick-carbs').value,
    fat: document.getElementById('quick-fat').value,
  });
  event.currentTarget.reset();
});

function renderFoodSearch(query = '') {
  const normalized = query.trim().toLowerCase();
  const results = foodDatabase.filter((food) => food.name.toLowerCase().includes(normalized));
  const container = document.getElementById('search-results');
  container.innerHTML = '';
  results.forEach((food) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-item';
    button.innerHTML = `<span>${food.emoji}</span><span><strong>${food.name}</strong><small>${food.serving}</small></span><b>${food.kcal} 千卡</b>`;
    button.addEventListener('click', () => addFood(food));
    container.append(button);
  });
}
document.getElementById('food-search').addEventListener('input', (event) => renderFoodSearch(event.target.value));
renderFoodSearch();

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

document.getElementById('setup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.profile = { name: values.name.trim(), birthDate: values.birthDate, gender: values.gender, height: number(values.height) || null, targetWeight: number(values.targetWeight) || null };
  state.goals = { kcal: number(values.kcalGoal) || null, carbs: null, protein: null, fat: null };
  if (values.weight) state.weights.push({ id: crypto.randomUUID(), date: todayISO(), weight: number(values.weight) });
  state.initialized = true;
  saveState();
  document.getElementById('setup-dialog').close();
  renderAll();
  if (!state.goals.carbs) openGoals();
});

function fillForm(form, values) {
  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value ?? '';
  });
}

function openProfile() {
  fillForm(document.getElementById('profile-form'), state.profile);
  openDialog('profile-dialog');
}

document.getElementById('profile-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.profile = { name: values.name.trim(), birthDate: values.birthDate, gender: values.gender, height: number(values.height) || null, targetWeight: number(values.targetWeight) || null };
  saveState();
  event.currentTarget.closest('dialog').close();
  renderAll();
  showToast('个人档案已更新');
});

function openGoals() {
  fillForm(document.getElementById('goals-form'), state.goals);
  openDialog('goals-dialog');
}

document.getElementById('goals-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.goals = { kcal: number(values.kcal), carbs: number(values.carbs), protein: number(values.protein), fat: number(values.fat) };
  saveState();
  event.currentTarget.closest('dialog').close();
  renderAll();
  showToast('每日目标已保存');
});

function openAppearance() {
  fillForm(document.getElementById('appearance-form'), state.settings);
  openDialog('appearance-dialog');
}

document.getElementById('appearance-form').addEventListener('submit', (event) => {
  event.preventDefault();
  state.settings = { ...state.settings, ...formValues(event.currentTarget) };
  saveState();
  event.currentTarget.closest('dialog').close();
  renderAll();
  showToast('外观与单位已保存');
});

function openWeight() {
  const form = document.getElementById('weight-form');
  form.elements.date.value = todayISO();
  form.elements.weight.value = '';
  document.getElementById('weight-input-label').firstChild.textContent = state.settings.measurement === 'imperial' ? '体重（磅）' : '体重（公斤）';
  openDialog('weight-dialog');
}

document.getElementById('weight-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  const entered = number(values.weight);
  const kg = state.settings.measurement === 'imperial' ? entered / 2.20462 : entered;
  const existing = state.weights.find((item) => item.date === values.date);
  if (existing) existing.weight = kg;
  else state.weights.push({ id: crypto.randomUUID(), date: values.date, weight: kg });
  saveState();
  event.currentTarget.closest('dialog').close();
  renderAll();
  showToast('体重已保存');
});

document.getElementById('recipe-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.recipes.push({ id: crypto.randomUUID(), name: values.name.trim(), kcal: number(values.kcal), protein: number(values.protein), carbs: number(values.carbs), fat: number(values.fat) });
  saveState();
  event.currentTarget.reset();
  event.currentTarget.closest('dialog').close();
  renderRecipes();
  showToast('食谱已保存');
});

document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => {
  const action = button.dataset.action;
  if (action === 'profile') openProfile();
  if (action === 'goals') openGoals();
  if (action === 'appearance') openAppearance();
  if (action === 'weight') { setView('diary'); openWeight(); }
  if (action === 'weight-view') setView('diary');
  if (action === 'recipe') openDialog('recipe-dialog');
  if (action === 'data') openDialog('data-dialog');
  if (action === 'privacy') openDialog('privacy-dialog');
}));

document.getElementById('export-data').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `opennutri-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('备份已导出');
});

document.getElementById('import-data').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (imported.version !== 2 || !Array.isArray(imported.foods) || !Array.isArray(imported.weights)) throw new Error('invalid');
    state = imported;
    saveState();
    document.getElementById('data-dialog').close();
    renderAll();
    showToast('备份已恢复');
  } catch {
    showToast('无法读取这个备份文件');
  } finally {
    event.target.value = '';
  }
});

document.getElementById('reset-data').addEventListener('click', () => {
  if (!confirm('确定清空这台设备上的个人档案、餐食、体重和食谱吗？此操作无法撤销。')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('opennutri-web-state-v1');
  location.reload();
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (state.settings.theme === 'system') applyTheme();
});

const initialView = location.hash.slice(1);
if (views[initialView]) setView(initialView);
renderAll();
if (!state.initialized) openDialog('setup-dialog');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registration = await navigator.serviceWorker.register('./service-worker.js');
    registration.update();
  });
}
