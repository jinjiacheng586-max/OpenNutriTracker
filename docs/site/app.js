const STORAGE_KEY = 'opennutri-personal-v7';
const LEGACY_STORAGE_KEYS = ['opennutri-personal-v6', 'opennutri-personal-v5', 'opennutri-personal-v4', 'opennutri-personal-v3', 'opennutri-personal-v2', 'opennutri-web-state-v1'];
function localDateKey(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
const todayISO = () => localDateKey();
const emptyState = () => ({
  version: 7,
  initialized: false,
  profile: { name: '', birthDate: '', gender: '', height: null, targetWeight: null },
  goals: { kcal: null, carbs: null, protein: null, fat: null },
  goalProfiles: {
    training: { kcal: null, carbs: null, protein: null, fat: null },
    rest: { kcal: null, carbs: null, protein: null, fat: null },
  },
  trainingCycle: { anchorDate: todayISO(), anchorIndex: 0, overrides: {} },
  settings: { theme: 'system', energyUnit: 'kcal', measurement: 'metric' },
  foods: [],
  weights: [],
  burns: [],
  ingredients: [],
  recipes: [],
  ingredientsSeeded: false,
  templates: [],
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
      || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return emptyState();
    const saved = JSON.parse(raw);
    if (![2, 3, 4, 5, 6, 7].includes(saved?.version)) return emptyState();
    // v6 used one mixed `recipes` array for both ingredient shortcuts and
    // recipes. v7 keeps two real collections, so adding or changing one can
    // never silently place it in the other tab.
    const legacyLibrary = Array.isArray(saved.recipes) ? saved.recipes : [];
    const savedIngredients = saved.version >= 7 && Array.isArray(saved.ingredients)
      ? saved.ingredients
      : legacyLibrary.filter((item) => item.basis === 'per100g');
    const savedRecipes = saved.version >= 7
      ? legacyLibrary
      : legacyLibrary.filter((item) => item.basis !== 'per100g');
    const legacyGoals = { ...emptyState().goals, ...(saved.goals || {}) };
    const migrated = {
      ...emptyState(),
      ...saved,
      version: 7,
      goals: legacyGoals,
      goalProfiles: {
        training: { ...legacyGoals, ...(saved.goalProfiles?.training || {}) },
        rest: { ...legacyGoals, ...(saved.goalProfiles?.rest || {}) },
      },
      trainingCycle: {
        ...emptyState().trainingCycle,
        ...(saved.trainingCycle || {}),
        overrides: { ...(saved.trainingCycle?.overrides || {}) },
      },
      foods: Array.isArray(saved.foods) ? saved.foods : [],
      weights: Array.isArray(saved.weights) ? saved.weights : [],
      burns: Array.isArray(saved.burns) ? saved.burns : [],
      ingredients: savedIngredients.map((item) => ({ ...item, basis: 'per100g' })),
      recipes: savedRecipes.map((item) => ({ ...item, basis: 'serving' })),
      templates: Array.isArray(saved.templates) ? saved.templates : [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return emptyState();
  }
}

let state = loadState();
let selectedMeal = 'breakfast';
let activeIngredientId = null;
let editingIngredientId = null;
let editingTemplateId = null;
let libraryFilter = 'per100g';
let librarySearchQuery = '';
let energyRange = '30';
let weightRange = 'all';
const DAY_MS = 24 * 60 * 60 * 1000;
const mealNames = { breakfast: '早餐', lunch: '午餐', dinner: '晚餐', snack: '零食' };
const mealIcons = { breakfast: '☀', lunch: '☁', dinner: '☾', snack: '✦' };
const views = {
  home: ['我的一天', '今天'],
  diary: ['趋势与营养', '周期分析'],
  recipes: ['快捷记录库', '食材与食谱'],
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
  { name: '无糖酸奶', emoji: '🥛', kcal: 118, protein: 10, carbs: 12, fat: 3.5, serving: '200 克' },
  { name: '全麦面包', emoji: '🍞', kcal: 160, protein: 7, carbs: 28, fat: 2.5, serving: '2 片' },
  { name: '红薯', emoji: '🍠', kcal: 172, protein: 3.2, carbs: 40, fat: 0.2, serving: '200 克' },
  { name: '豆腐', emoji: '⬜', kcal: 152, protein: 16, carbs: 4, fat: 9, serving: '200 克' },
  { name: '三文鱼', emoji: '🐟', kcal: 312, protein: 34, carbs: 0, fat: 19, serving: '150 克' },
  { name: '牛油果', emoji: '🥑', kcal: 240, protein: 3, carbs: 13, fat: 22, serving: '1 个（150 克）' },
  { name: '杏仁', emoji: '🌰', kcal: 174, protein: 6.4, carbs: 6.5, fat: 15, serving: '30 克' },
  { name: '橙子', emoji: '🍊', kcal: 62, protein: 1.2, carbs: 15, fat: 0.2, serving: '1 个' },
  { name: '意大利面', emoji: '🍝', kcal: 316, protein: 12, carbs: 62, fat: 2, serving: '熟重 200 克' },
  { name: '金枪鱼罐头（水浸）', emoji: '🐟', kcal: 132, protein: 29, carbs: 0, fat: 1, serving: '120 克' },
  { name: '拿铁咖啡', emoji: '☕', kcal: 135, protein: 7, carbs: 10, fat: 7, serving: '300 毫升' },
  { name: '蛋白粉', emoji: '🥤', kcal: 120, protein: 24, carbs: 3, fat: 2, serving: '1 勺（30 克）' },
];

const starterIngredients = [
  { id: 'starter-chicken-breast', name: '鸡胸肉（熟）', emoji: '🍗', kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { id: 'starter-banana', name: '香蕉', emoji: '🍌', kcal: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { id: 'starter-skim-milk', name: '脱脂牛奶', emoji: '🥛', kcal: 34, protein: 3.4, carbs: 5, fat: 0.1 },
  { id: 'starter-raw-rice', name: '生白米', emoji: '🍚', kcal: 365, protein: 7.1, carbs: 80, fat: 0.7 },
  { id: 'starter-lean-beef', name: '瘦牛肉（熟）', emoji: '🥩', kcal: 200, protein: 26, carbs: 0, fat: 10 },
  { id: 'starter-egg', name: '鸡蛋', emoji: '🥚', kcal: 143, protein: 12.6, carbs: 0.7, fat: 9.5 },
  { id: 'starter-oats', name: '燕麦片', emoji: '🥣', kcal: 379, protein: 13.2, carbs: 67.7, fat: 6.5 },
  { id: 'starter-broccoli', name: '西兰花', emoji: '🥦', kcal: 35, protein: 2.4, carbs: 7.2, fat: 0.4 },
  { id: 'starter-sweet-potato', name: '熟红薯', emoji: '🍠', kcal: 90, protein: 2, carbs: 20.7, fat: 0.2 },
  { id: 'starter-salmon', name: '三文鱼（熟）', emoji: '🐟', kcal: 208, protein: 20.4, carbs: 0, fat: 13.4 },
].map((item) => ({ ...item, basis: 'per100g' }));

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ensureStarterIngredients() {
  state.ingredients = (state.ingredients || []).map((item) => ({ ...item, basis: 'per100g', emoji: item.emoji || '🍴' }));
  state.recipes = (state.recipes || []).map((item) => ({ ...item, basis: 'serving', emoji: item.emoji || '🍲' }));
  if (state.ingredientsSeeded) return;
  const names = new Set(state.ingredients.map((item) => String(item.name).trim().toLowerCase()));
  const starters = starterIngredients.filter((item) => !names.has(item.name.toLowerCase()));
  state.ingredients = [...starters, ...state.ingredients];
  state.ingredientsSeeded = true;
  saveState();
}

ensureStarterIngredients();

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateSerial(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function cycleIndexForDate(date = todayISO()) {
  const anchorDate = state.trainingCycle?.anchorDate || todayISO();
  const anchorIndex = number(state.trainingCycle?.anchorIndex);
  const offset = dateSerial(date) - dateSerial(anchorDate);
  return ((anchorIndex + offset) % 4 + 4) % 4;
}

function dayTypeForDate(date = todayISO()) {
  const override = state.trainingCycle?.overrides?.[date];
  if (override === 'training' || override === 'rest') return override;
  return cycleIndexForDate(date) === 3 ? 'rest' : 'training';
}

function goalsForDate(date = todayISO()) {
  const type = dayTypeForDate(date);
  return state.goalProfiles?.[type] || state.goals;
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
  const dayType = dayTypeForDate();
  const dayTypeButton = document.getElementById('day-type-toggle');
  dayTypeButton.textContent = dayType === 'training' ? '🏋️ 训练日' : '🌿 休息日';
  dayTypeButton.classList.toggle('rest', dayType === 'rest');
  dayTypeButton.setAttribute('aria-label', `今天是${dayType === 'training' ? '训练日' : '休息日'}，点击临时切换`);
}

function renderDashboard() {
  const totals = totalsForDate(todayISO());
  const activeGoals = goalsForDate();
  const goal = number(activeGoals.kcal);
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
    const macroGoal = number(activeGoals[key]);
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

function dateKeyFromSerial(serial) {
  const date = new Date(serial * DAY_MS);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function energyDay(iso) {
  const hasFood = state.foods.some((food) => food.date === iso);
  const burnRecord = state.burns.find((item) => item.date === iso);
  const hasBurn = Boolean(burnRecord);
  const intake = totalsForDate(iso).kcal;
  const burn = hasBurn ? number(burnRecord.kcal) : null;
  return {
    iso,
    intake,
    burn,
    hasFood,
    hasBurn,
    recorded: hasFood || hasBurn,
    complete: hasFood && hasBurn,
    balance: hasFood && hasBurn ? intake - burn : null,
    goal: number(goalsForDate(iso).kcal) || null,
  };
}

function energyDaysBetween(startSerial, endSerial) {
  return Array.from(
    { length: Math.max(0, endSerial - startSerial + 1) },
    (_, index) => energyDay(dateKeyFromSerial(startSerial + index)),
  );
}

function aggregateEnergyDays(days, key, label) {
  const intakeDays = days.filter((day) => day.hasFood);
  const burnDays = days.filter((day) => day.hasBurn);
  const completeDays = days.filter((day) => day.complete);
  return {
    key,
    label,
    days,
    recordedCount: days.filter((day) => day.recorded).length,
    completeCount: completeDays.length,
    intake: average(intakeDays.map((day) => day.intake)),
    burn: average(burnDays.map((day) => day.burn)),
    balance: average(completeDays.map((day) => day.balance)),
  };
}

function groupEnergyDays(days, mode) {
  const groups = new Map();
  days.forEach((day) => {
    const serial = dateSerial(day.iso);
    let key = day.iso;
    let label = day.iso.slice(5);
    if (mode === 'week') {
      const weekday = new Date(serial * DAY_MS).getUTCDay();
      key = dateKeyFromSerial(serial - ((weekday + 6) % 7));
      label = key.slice(5);
    } else if (mode === 'month') {
      key = day.iso.slice(0, 7);
      label = `${number(key.slice(5))}月`;
    } else {
      const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short', timeZone: 'UTC' })
        .format(new Date(serial * DAY_MS))
        .replace('周', '');
      label = weekday;
    }
    if (!groups.has(key)) groups.set(key, { label, days: [] });
    groups.get(key).days.push(day);
  });
  return [...groups].map(([key, group]) => aggregateEnergyDays(group.days, key, group.label));
}

function balanceDescription(value) {
  if (value == null) return '数据不足';
  if (Math.abs(value) < 1) return '基本平衡';
  return `${value > 0 ? '盈余' : '缺口'} ${displayEnergy(Math.abs(value))}`;
}

function energyPeriodRow(period, type) {
  const label = type === 'month'
    ? `${period.key.slice(0, 4)}年${number(period.key.slice(5))}月`
    : `${period.key.slice(5)} 起`;
  const balanceClass = period.balance == null ? 'missing-balance' : period.balance > 0 ? 'surplus-text' : 'deficit-text';
  return `<div class="energy-period-row"><span class="period-date">${label}</span><span><small>平均摄入</small><strong>${period.intake == null ? '—' : displayEnergy(period.intake)}</strong></span><span><small>平均消耗</small><strong>${period.burn == null ? '—' : displayEnergy(period.burn)}</strong></span><span class="period-balance"><small>${period.completeCount} 天完整</small><strong class="${balanceClass}">${balanceDescription(period.balance)}</strong></span></div>`;
}

function renderEnergyPeriodLists(allDays) {
  const weekly = groupEnergyDays(allDays, 'week').filter((period) => period.recordedCount).slice(-8).reverse();
  const monthly = groupEnergyDays(allDays, 'month').filter((period) => period.recordedCount).slice(-6).reverse();
  document.getElementById('weekly-energy-list').innerHTML = weekly.length
    ? weekly.map((period) => energyPeriodRow(period, 'week')).join('')
    : '<p class="inline-empty">还没有足够的每周记录。</p>';
  document.getElementById('monthly-energy-list').innerHTML = monthly.length
    ? monthly.map((period) => energyPeriodRow(period, 'month')).join('')
    : '<p class="inline-empty">记录一段时间后，这里会显示每月平均。</p>';
}

function renderWeek() {
  const todaySerial = dateSerial(todayISO());
  const recordedDates = [...state.foods.map((food) => food.date), ...state.burns.map((burn) => burn.date)]
    .filter(Boolean)
    .sort();
  const earliestSerial = recordedDates.length ? Math.min(todaySerial, dateSerial(recordedDates[0])) : todaySerial - 29;
  const rangeLength = energyRange === 'all' ? null : number(energyRange);
  const startSerial = rangeLength == null ? earliestSerial : todaySerial - rangeLength + 1;
  const days = energyDaysBetween(startSerial, todaySerial);
  const allDays = energyDaysBetween(earliestSerial, todaySerial);
  const recordedDays = days.filter((day) => day.recorded);
  const intakeDays = days.filter((day) => day.hasFood);
  const burnDays = days.filter((day) => day.hasBurn);
  const completeDays = days.filter((day) => day.complete);
  const averageIntake = average(intakeDays.map((day) => day.intake));
  const averageBurn = average(burnDays.map((day) => day.burn));
  const averageBalance = average(completeDays.map((day) => day.balance));
  const mode = energyRange === '7' ? 'day' : energyRange === 'all' ? 'month' : 'week';
  const periodName = energyRange === 'all' ? '全部记录' : `最近 ${energyRange} 天`;
  const modeName = mode === 'day' ? '按日' : mode === 'week' ? '按周' : '按月';

  document.querySelectorAll('[data-energy-range]').forEach((button) => button.classList.toggle('active', button.dataset.energyRange === energyRange));
  document.getElementById('energy-period-label').textContent = `${periodName} · ${modeName}`;
  document.getElementById('energy-chart-title').textContent = `${modeName}平均热量收支`;
  document.getElementById('energy-summary').innerHTML = [
    ['🍽', '平均摄入', averageIntake == null ? '—' : displayEnergy(averageIntake)],
    ['🔥', '平均消耗', averageBurn == null ? '—' : displayEnergy(averageBurn)],
    ['⚖', '平均收支', balanceDescription(averageBalance)],
    ['✓', '完整记录', `${completeDays.length} / ${days.length} 天`],
  ].map(([icon, label, value]) => `<div><span>${icon}</span><p><small>${label}</small><strong>${value}</strong></p></div>`).join('');

  const chartGroups = groupEnergyDays(days, mode).slice(-14);
  const balancedGroups = chartGroups.filter((group) => group.balance != null);
  const maxAbs = Math.max(...balancedGroups.map((group) => Math.abs(group.balance)), 1);
  const container = document.getElementById('week-bars');
  if (!balancedGroups.length) {
    container.innerHTML = '<div class="energy-chart-empty"><span>⌁</span><strong>还不能计算热量收支</strong><small>同一天同时记录饮食和消耗后，这里才会比较盈余或缺口。</small></div>';
  } else {
    container.innerHTML = chartGroups.map((group) => {
      if (group.balance == null) return `<div><span class="bar-value">—</span><span class="balance-track"><i class="missing"></i></span><span>${group.label}</span></div>`;
      const height = Math.max(4, Math.abs(group.balance) / maxAbs * 45);
      const direction = group.balance > 0 ? 'surplus' : group.balance < 0 ? 'deficit' : 'balanced';
      return `<div title="平均摄入 ${group.intake == null ? '—' : formatNumber(group.intake)} · 平均消耗 ${group.burn == null ? '—' : formatNumber(group.burn)}"><span class="bar-value">${group.balance > 0 ? '+' : group.balance < 0 ? '−' : ''}${formatNumber(Math.abs(group.balance))}</span><span class="balance-track"><i class="${direction}" style="height:${height}%;${group.balance > 0 ? 'bottom:50%' : 'top:50%'}"></i></span><span>${group.label}</span></div>`;
    }).join('');
  }

  const insight = document.getElementById('energy-insight');
  if (!recordedDays.length) {
    insight.innerHTML = '<span>◎</span><div><strong>还没有这个区间的热量记录</strong><small>记录饮食后可看到平均摄入；同时记录每日消耗后，才能得到完整的盈余或缺口总结。</small></div>';
  } else if (!completeDays.length) {
    insight.innerHTML = `<span>🔥</span><div><strong>已有 ${intakeDays.length} 天饮食记录，但缺少可比较的消耗</strong><small>热量收支只使用饮食和消耗都完整的日期，避免把漏记误判成巨大缺口。</small></div>`;
  } else {
    const deficits = completeDays.filter((day) => day.balance < 0).length;
    const surpluses = completeDays.filter((day) => day.balance > 0).length;
    const goalDays = intakeDays.filter((day) => day.goal);
    const goalHits = goalDays.filter((day) => Math.abs(day.intake - day.goal) / day.goal <= 0.1).length;
    const direction = averageBalance < -1 ? '平均处于热量缺口' : averageBalance > 1 ? '平均处于热量盈余' : '平均热量基本平衡';
    const icon = averageBalance < -1 ? '↘' : averageBalance > 1 ? '↗' : '≈';
    const goalCopy = goalDays.length ? `摄入落在目标 ±10% 内的有 ${goalHits}/${goalDays.length} 天。` : '设置热量目标后，这里还会统计目标达成情况。';
    insight.innerHTML = `<span>${icon}</span><div><strong>${direction}：${balanceDescription(averageBalance)}</strong><small>${completeDays.length} 个完整记录日中，${deficits} 天缺口、${surpluses} 天盈余。${goalCopy}</small></div>`;
  }
  insight.hidden = false;

  const historyDays = [...recordedDays].reverse().slice(0, 14);
  document.getElementById('energy-history-count').textContent = recordedDays.length > 14 ? `显示最近 14 / ${recordedDays.length} 天` : `${recordedDays.length} 天有记录`;
  document.getElementById('balance-history').innerHTML = historyDays.length
    ? historyDays.map((day) => {
        const result = day.complete
          ? `<strong class="${day.balance > 0 ? 'surplus-text' : 'deficit-text'}">${balanceDescription(day.balance)}</strong>`
          : `<strong class="missing-balance">缺少${day.hasFood ? '消耗' : '饮食'}</strong>`;
        return `<div><span>${day.iso.slice(5)}</span><small>摄入 ${day.hasFood ? displayEnergy(day.intake) : '—'} · 消耗 ${day.hasBurn ? displayEnergy(day.burn) : '—'}</small>${result}</div>`;
      }).join('')
    : '<p class="inline-empty">这个区间还没有热量记录。</p>';

  renderEnergyPeriodLists(allDays);
}

function renderNutrients() {
  const totals = totalsForDate(todayISO());
  const activeGoals = goalsForDate();
  const nutrients = [
    ['蛋白质', totals.protein, activeGoals.protein, '克', 'P'],
    ['碳水化合物', totals.carbs, activeGoals.carbs, '克', 'C'],
    ['脂肪', totals.fat, activeGoals.fat, '克', 'F'],
    ['已记录食物', state.foods.filter((food) => food.date === todayISO()).length, null, '项', '✓'],
  ];
  document.getElementById('nutrient-grid').innerHTML = nutrients.map(([name, value, goal, unit, icon]) => {
    const percent = goal ? Math.min(100, Math.round(number(value) / number(goal) * 100)) : 0;
    return `<article class="nutrient-card"><span>${icon}</span><div><strong>${name}</strong><small>${formatNumber(value, 1)}${unit}${goal ? ` / ${formatNumber(goal)}${unit}` : ''}</small>${goal ? `<div class="progress"><i style="width:${percent}%"></i></div>` : ''}</div><b>${goal ? `${percent}%` : ''}</b></article>`;
  }).join('');
}

function weightDelta(valueKg) {
  const value = state.settings.measurement === 'imperial' ? valueKg * 2.20462 : valueKg;
  return `${value > 0 ? '+' : ''}${formatNumber(value, 1)} ${state.settings.measurement === 'imperial' ? '磅' : '公斤'}`;
}

function weightMagnitude(valueKg) {
  const value = state.settings.measurement === 'imperial' ? Math.abs(valueKg) * 2.20462 : Math.abs(valueKg);
  return `${formatNumber(value, 1)} ${state.settings.measurement === 'imperial' ? '磅' : '公斤'}`;
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + number(value), 0) / values.length : null;
}

// Least-squares slope uses every reading in the selected period. This avoids
// calling a one-day fluctuation between the first and last point a "trend".
function weightTrendPerDay(weights) {
  if (weights.length < 2) return null;
  const xs = weights.map((item) => dateSerial(item.date));
  const xMean = average(xs);
  const yMean = average(weights.map((item) => item.weight));
  const denominator = xs.reduce((sum, x) => sum + ((x - xMean) ** 2), 0);
  if (!denominator) return 0;
  return weights.reduce((sum, item, index) => sum + ((xs[index] - xMean) * (item.weight - yMean)), 0) / denominator;
}

function renderMonthlyWeights(weights) {
  const card = document.getElementById('monthly-weight-card');
  const container = document.getElementById('monthly-weight-list');
  const groups = new Map();
  weights.forEach((item) => {
    const key = item.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item.weight);
  });
  const months = [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([month, values]) => ({ month, average: average(values), count: values.length })).slice(-6);
  card.hidden = months.length === 0;
  if (!months.length) return;
  document.getElementById('monthly-weight-subtitle').textContent = `最近 ${months.length} 个月`;
  const values = months.map((item) => item.average);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(max - min, 0.5);
  container.innerHTML = months.map((item, index) => {
    const previous = months[index - 1];
    const delta = previous ? item.average - previous.average : null;
    const width = 38 + ((item.average - min) / spread * 62);
    const [year, month] = item.month.split('-');
    return `<div class="monthly-weight-row"><span>${year.slice(2)}年${number(month)}月</span><div class="monthly-weight-bar"><i style="width:${Math.min(100, width)}%"></i></div><div class="monthly-weight-value"><strong>${displayWeight(item.average)}</strong><small>${item.count} 次${delta == null ? '' : ` · 较上月 ${weightDelta(delta)}`}</small></div></div>`;
  }).join('');
}

function renderWeightChart() {
  const chart = document.getElementById('weight-chart');
  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date));
  const summary = document.getElementById('weight-summary');
  const insight = document.getElementById('weight-insight');
  const history = document.getElementById('weight-history');
  const todaySerial = dateSerial(todayISO());
  const periodWeights = weightRange === 'all' ? weights : weights.filter((item) => dateSerial(item.date) >= todaySerial - number(weightRange));
  document.querySelectorAll('[data-weight-range]').forEach((button) => button.classList.toggle('active', button.dataset.weightRange === weightRange));
  document.getElementById('weight-period-label').textContent = weightRange === 'all' ? '全部记录' : `最近 ${weightRange} 天`;
  history.innerHTML = '';
  renderMonthlyWeights(weights);
  if (!weights.length) {
    chart.className = 'weight-chart empty-chart';
    chart.innerHTML = '<div><span>⚖</span><strong>还没有体重记录</strong><small>添加第一次体重后，这里会显示趋势分析和月均值</small></div>';
    summary.innerHTML = '';
    insight.hidden = true;
    return;
  }
  if (!periodWeights.length) {
    chart.className = 'weight-chart empty-chart';
    chart.innerHTML = `<div><span>⌁</span><strong>这个区间没有记录</strong><small>切换到更长的时间范围看看</small></div>`;
    summary.innerHTML = '';
    insight.hidden = true;
  } else {
    const values = periodWeights.map((item) => item.weight);
    const min = Math.min(...values) - 0.5;
    const max = Math.max(...values) + 0.5;
    const range = Math.max(1, max - min);
    const firstSerial = dateSerial(periodWeights[0].date);
    const lastSerial = dateSerial(periodWeights.at(-1).date);
    const dateRange = Math.max(1, lastSerial - firstSerial);
    const points = periodWeights.map((item) => ({
      x: periodWeights.length === 1 ? 50 : 7 + (dateSerial(item.date) - firstSerial) / dateRange * 86,
      y: 88 - (item.weight - min) / range * 70,
      item,
    }));
    const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
    chart.className = 'weight-chart';
    chart.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="${weightRange === 'all' ? '全部' : `最近${weightRange}天`}体重趋势图"><line x1="5" y1="88" x2="95" y2="88" class="chart-axis"/><polyline points="${polyline}" class="chart-line"/>${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="2.2" class="chart-dot"><title>${point.item.date} ${displayWeight(point.item.weight)}</title></circle>`).join('')}</svg><div class="chart-labels"><span>${periodWeights[0].date.slice(5)}</span><span>${periodWeights.at(-1).date.slice(5)}</span></div>`;
    const latest = weights.at(-1).weight;
    const periodAverage = average(values);
    const slope = weightTrendPerDay(periodWeights);
    const weeklyTrend = slope == null ? null : slope * 7;
    const target = number(state.profile.targetWeight) || null;
    summary.innerHTML = `<p><span>最新体重</span><strong>${displayWeight(latest)}</strong></p><p><span>区间平均</span><strong>${displayWeight(periodAverage)}</strong></p><p><span>每周趋势</span><strong>${weeklyTrend == null ? '记录不足' : weightDelta(weeklyTrend)}</strong></p><p><span>${target ? '距离目标' : '区间记录'}</span><strong>${target ? displayWeight(Math.abs(latest - target)) : `${periodWeights.length} 次`}</strong></p>`;
    if (weeklyTrend == null) {
      insight.innerHTML = '<span>◎</span><div><strong>再记录一次就能分析趋势</strong><small>趋势会综合区间内的所有记录，不会只拿开头和结尾相减。</small></div>';
    } else {
      const stable = Math.abs(weeklyTrend) < 0.05;
      const direction = stable ? '基本稳定' : weeklyTrend < 0 ? '整体下降' : '整体上升';
      const icon = stable ? '≈' : weeklyTrend < 0 ? '↘' : '↗';
      const movingTowardTarget = (latest > target) === (weeklyTrend < 0);
      const targetCopy = target ? (Math.abs(latest - target) < 0.2 ? '目前已非常接近目标体重。' : movingTowardTarget ? '当前方向正朝目标靠近。' : '当前方向暂时没有朝目标靠近。') : '设置目标体重后，这里还会判断方向是否符合目标。';
      insight.innerHTML = `<span>${icon}</span><div><strong>${direction}，约 ${weightMagnitude(weeklyTrend)}/周</strong><small>这是根据区间内 ${periodWeights.length} 次记录拟合的趋势，不是简单首尾相减。${targetCopy}</small></div>`;
    }
    insight.hidden = false;
  }
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
  const trainingGoals = state.goalProfiles.training;
  const restGoals = state.goalProfiles.rest;
  document.getElementById('goal-setting-summary').textContent = trainingGoals.kcal
    ? `训练 ${displayEnergy(trainingGoals.kcal)} · 休息 ${displayEnergy(restGoals.kcal)}`
    : '分别设置训练日和休息日目标';
  const themeNames = { system: '跟随系统', light: '浅色', dark: '深色' };
  document.getElementById('appearance-summary').textContent = `${themeNames[state.settings.theme]} · ${state.settings.energyUnit === 'kj' ? '千焦' : '千卡'} · ${state.settings.measurement === 'imperial' ? '英制' : '公制'}`;
}

function renderRecipes() {
  const grid = document.getElementById('recipe-grid');
  grid.innerHTML = '';
  const source = libraryFilter === 'per100g' ? state.ingredients : state.recipes;
  const query = librarySearchQuery.trim().toLowerCase();
  const items = source.filter((item) => !query || `${item.name} ${item.emoji || ''}`.toLowerCase().includes(query));
  document.querySelectorAll('[data-library-tab]').forEach((button) => button.classList.toggle('active', button.dataset.libraryTab === libraryFilter));
  document.getElementById('ingredient-library-copy').hidden = libraryFilter !== 'per100g';
  document.getElementById('recipe-library-copy').hidden = libraryFilter === 'per100g';
  document.getElementById('library-search').placeholder = libraryFilter === 'per100g' ? '搜索常用食材' : '搜索常用食谱';
  const empty = document.getElementById('recipe-empty');
  empty.hidden = items.length > 0;
  empty.querySelector('h2').textContent = query ? '没有匹配的结果' : libraryFilter === 'per100g' ? '还没有常用食材' : '还没有常用食谱';
  empty.querySelector('p').textContent = query ? '换个关键词，或清空搜索后查看全部。' : libraryFilter === 'per100g' ? '添加每 100 克营养，以后只输入克数即可。' : '保存经常烧的菜，下次直接按份记录。';
  empty.querySelector('button').hidden = Boolean(query);
  empty.querySelector('button').textContent = libraryFilter === 'per100g' ? '添加第一个食材' : '添加第一个食谱';
  empty.querySelector('button').dataset.action = libraryFilter === 'per100g' ? 'ingredient' : 'recipe';
  items.forEach((ingredient) => {
    const per100g = ingredient.basis === 'per100g';
    const card = document.createElement('article');
    card.className = 'recipe-card';
    card.innerHTML = `<div class="recipe-visual"></div><div><span class="label">${per100g ? '每 100 克' : '固定一份'}</span><h3></h3><p>${displayEnergy(ingredient.kcal)} · 蛋白质 ${formatNumber(ingredient.protein, 1)} 克</p><div class="recipe-actions"><button type="button" class="use-recipe">${per100g ? '输入克数' : '输入份数'}</button><button type="button" class="edit-recipe">修改</button><button type="button" class="delete-recipe">删除</button></div></div>`;
    card.querySelector('.recipe-visual').textContent = ingredient.emoji || '🍴';
    card.querySelector('h3').textContent = ingredient.name;
    card.querySelector('.use-recipe').addEventListener('click', () => {
      openIngredientLog(ingredient);
    });
    card.querySelector('.edit-recipe').addEventListener('click', () => {
      openIngredientEditor(ingredient);
    });
    card.querySelector('.delete-recipe').addEventListener('click', () => {
      if (!confirm(`删除“${ingredient.name}”吗？`)) return;
      if (per100g) state.ingredients = state.ingredients.filter((item) => item.id !== ingredient.id);
      else state.recipes = state.recipes.filter((item) => item.id !== ingredient.id);
      saveState();
      renderRecipes();
      showToast(per100g ? '食材已删除' : '食谱已删除');
    });
    grid.append(card);
  });
}

function openIngredientLog(ingredient) {
  activeIngredientId = ingredient.id;
  const form = document.getElementById('ingredient-log-form');
  const per100g = ingredient.basis === 'per100g';
  document.getElementById('ingredient-log-name').textContent = ingredient.name;
  document.getElementById('ingredient-amount-label').firstChild.textContent = per100g ? '食用重量（克）' : '食用份数';
  form.elements.amount.value = per100g ? 100 : 1;
  form.elements.amount.min = per100g ? '1' : '0.1';
  form.elements.amount.step = per100g ? '1' : '0.1';
  form.elements.meal.value = selectedMeal;
  document.getElementById('ingredient-log-help').textContent = per100g
    ? `营养数据按每 100 克计算，输入实际食用重量即可。`
    : '这是按一整份保存的食谱，可输入 0.5、1、2 等份数。';
  openDialog('ingredient-log-dialog');
}

function openIngredientEditor(ingredient = null, defaultBasis = 'per100g') {
  editingIngredientId = ingredient?.id || null;
  const form = document.getElementById('recipe-form');
  form.reset();
  const basis = ingredient?.basis || defaultBasis;
  const noun = basis === 'per100g' ? '食材' : '食谱';
  form.elements.libraryType.value = basis === 'per100g' ? 'ingredient' : 'recipe';
  form.elements.name.closest('label').firstChild.textContent = `${noun}名称`;
  form.elements.name.placeholder = basis === 'per100g' ? '例如：鸡胸肉（熟）' : '例如：番茄炖牛肉';
  document.getElementById('ingredient-editor-title').textContent = ingredient ? `修改${noun}` : `添加${noun}`;
  document.getElementById('ingredient-save-button').textContent = ingredient ? '保存修改' : `保存${noun}`;
  fillForm(form, ingredient || { emoji: basis === 'per100g' ? '🍴' : '🍲' });
  updateIngredientBasisHint();
  openDialog('recipe-dialog');
}

function updateIngredientBasisHint() {
  const basis = document.querySelector('input[name="libraryType"]:checked').value === 'ingredient' ? 'per100g' : 'serving';
  const noun = basis === 'per100g' ? '食材' : '食谱';
  const form = document.getElementById('recipe-form');
  form.elements.name.closest('label').firstChild.textContent = `${noun}名称`;
  form.elements.name.placeholder = basis === 'per100g' ? '例如：鸡胸肉（熟）' : '例如：番茄炖牛肉';
  form.querySelector('.dialog-header .label').textContent = basis === 'per100g' ? '常用食材' : '常用食谱';
  document.getElementById('ingredient-editor-title').textContent = editingIngredientId ? `修改${noun}` : `添加${noun}`;
  document.getElementById('ingredient-save-button').textContent = editingIngredientId ? '保存修改' : `保存${noun}`;
  document.getElementById('ingredient-basis-hint').textContent = basis === 'per100g'
    ? '下面填写每 100 克所含的营养；记录时只需输入吃了多少克。'
    : '填写整道菜一份的营养；以后记录时可输入 0.5、1、2 等份数。';
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
  renderQuickLists();
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
  if (button.dataset.addTab === 'recent' || button.dataset.addTab === 'templates') renderQuickLists();
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
  const addDialog = document.getElementById('add-dialog');
  if (addDialog.open) addDialog.close();
  showToast(`已添加到${mealNames[selectedMeal]}`);
}

function normalizedFood(food) {
  return {
    name: String(food.name || '未命名食物').trim(),
    emoji: food.emoji || '🍴',
    serving: food.serving || '1 份',
    kcal: number(food.kcal),
    protein: number(food.protein),
    carbs: number(food.carbs),
    fat: number(food.fat),
  };
}

function resultButton(food, { removable = false } = {}) {
  const item = normalizedFood(food);
  const row = document.createElement('div');
  row.className = 'result-row';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'result-item';
  const icon = document.createElement('span');
  icon.textContent = item.emoji;
  const detail = document.createElement('span');
  const title = document.createElement('strong');
  title.textContent = item.name;
  const meta = document.createElement('small');
  meta.textContent = `${item.serving} · 蛋白质 ${formatNumber(item.protein, 1)} 克`;
  detail.append(title, meta);
  const energy = document.createElement('b');
  energy.textContent = displayEnergy(item.kcal);
  button.append(icon, detail, energy);
  button.addEventListener('click', () => addFood(item));
  row.append(button);
  if (removable) {
    const actions = document.createElement('span');
    actions.className = 'template-row-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'edit-template';
    edit.setAttribute('aria-label', `修改模板${item.name}`);
    edit.textContent = '✎';
    edit.addEventListener('click', () => {
      editingTemplateId = food.id;
      document.getElementById('quick-name').value = item.name;
      document.getElementById('quick-kcal').value = item.kcal;
      document.getElementById('quick-protein').value = item.protein;
      document.getElementById('quick-carbs').value = item.carbs;
      document.getElementById('quick-fat').value = item.fat;
      document.getElementById('save-as-template').checked = true;
      document.querySelector('[data-add-tab="quick"]').click();
      document.getElementById('quick-name').focus();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-template';
    remove.setAttribute('aria-label', `删除模板${item.name}`);
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      state.templates = state.templates.filter((template) => template.id !== food.id);
      saveState();
      renderQuickLists();
      showToast('快捷模板已删除');
    });
    actions.append(edit, remove);
    row.append(actions);
  }
  return row;
}

function recentFoods(limit = 10) {
  const seen = new Set();
  return [...state.foods].reverse().filter((food) => {
    const key = `${food.name}|${number(food.kcal)}|${number(food.protein)}|${number(food.carbs)}|${number(food.fat)}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

function renderQuickList(containerId, foods, options = {}) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  if (!foods.length) {
    const empty = document.createElement('p');
    empty.className = 'inline-empty';
    empty.textContent = options.emptyText || '这里还没有内容。';
    container.append(empty);
    return;
  }
  foods.forEach((food) => container.append(resultButton(food, options)));
}

function renderQuickLists() {
  renderQuickList('recent-results', recentFoods(), { emptyText: '记录过食物后，这里会自动出现最近项目。' });
  const query = document.getElementById('template-search').value.trim().toLowerCase();
  const templates = state.templates.filter((template) => !query || template.name.toLowerCase().includes(query));
  renderQuickList('template-results', templates, { removable: true, emptyText: query ? '没有匹配的快捷模板。' : '还没有快捷模板。可在手动输入时勾选“保存为快捷模板”。' });
}

function saveTemplate(food) {
  const item = normalizedFood(food);
  const existing = state.templates.find((template) => template.id === editingTemplateId)
    || state.templates.find((template) => template.name.toLowerCase() === item.name.toLowerCase());
  if (existing) Object.assign(existing, item);
  else state.templates.unshift({ id: crypto.randomUUID(), ...item });
  editingTemplateId = null;
}

document.getElementById('add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const food = {
    name: document.getElementById('quick-name').value.trim(),
    kcal: document.getElementById('quick-kcal').value,
    protein: document.getElementById('quick-protein').value,
    carbs: document.getElementById('quick-carbs').value,
    fat: document.getElementById('quick-fat').value,
  };
  if (document.getElementById('save-as-template').checked) saveTemplate(food);
  else editingTemplateId = null;
  addFood(food);
  event.currentTarget.reset();
});

let foodSearchController;

function localFoodResults(query) {
  const normalized = query.trim().toLowerCase();
  return foodDatabase.filter((food) => food.name.toLowerCase().includes(normalized));
}

function renderFoodResults(results) {
  const container = document.getElementById('search-results');
  container.innerHTML = '';
  results.forEach((food) => container.append(resultButton(food)));
}

function openFoodFactsItem(hit) {
  const nutriments = hit.nutriments || {};
  const brands = Array.isArray(hit.brands) ? hit.brands.join(', ') : hit.brands;
  return {
    name: hit.product_name || hit.product_name_en || brands || '未命名食品',
    emoji: '🛒',
    serving: `每 100 克${brands ? ` · ${brands}` : ''}`,
    kcal: nutriments['energy-kcal_100g'],
    protein: nutriments.proteins_100g,
    carbs: nutriments.carbohydrates_100g,
    fat: nutriments.fat_100g,
  };
}

async function renderFoodSearch(query = '', searchOnline = false) {
  const local = localFoodResults(query);
  renderFoodResults(local);
  const status = document.getElementById('food-search-status');
  if (!searchOnline) {
    status.textContent = '输入时筛选内置食物；需要更多包装食品时，再点击“搜索在线库”。';
    return;
  }
  if (query.trim().length < 2) {
    status.textContent = '请至少输入 2 个字再搜索在线食品库。';
    return;
  }
  foodSearchController?.abort();
  foodSearchController = new AbortController();
  status.textContent = '正在搜索食品库…';
  try {
    const fields = 'code,brands,product_name,product_name_en,nutriments';
    const params = new URLSearchParams({ q: query.trim(), fields, langs: 'zh,en', page_size: '20', page: '1' });
    const response = await fetch(`https://search.openfoodfacts.org/search?${params}`, { signal: foodSearchController.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const remote = (Array.isArray(data.hits) ? data.hits : [])
      .map(openFoodFactsItem)
      .filter((food) => food.name && number(food.kcal) > 0);
    const seen = new Set();
    const combined = [...local, ...remote].filter((food) => {
      const key = food.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    renderFoodResults(combined);
    status.textContent = remote.length ? `找到 ${combined.length} 项；包装食品数据来自 Open Food Facts。` : '食品库没有更多匹配，已显示内置结果。';
  } catch (error) {
    if (error.name === 'AbortError') return;
    status.textContent = '在线食品库暂时不可用，已显示内置结果。';
  }
}
document.getElementById('food-search').addEventListener('input', (event) => renderFoodSearch(event.target.value));
document.getElementById('food-search').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  renderFoodSearch(event.currentTarget.value, true);
});
document.getElementById('online-food-search').addEventListener('click', () => {
  renderFoodSearch(document.getElementById('food-search').value, true);
});
renderFoodSearch();
renderQuickLists();

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

document.getElementById('setup-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.profile = { name: values.name.trim(), birthDate: values.birthDate, gender: values.gender, height: number(values.height) || null, targetWeight: number(values.targetWeight) || null };
  const initialGoals = { kcal: number(values.kcalGoal) || null, carbs: null, protein: null, fat: null };
  state.goals = initialGoals;
  state.goalProfiles = { training: { ...initialGoals }, rest: { ...initialGoals } };
  state.trainingCycle = { anchorDate: todayISO(), anchorIndex: 0, overrides: {} };
  if (values.weight) state.weights.push({ id: crypto.randomUUID(), date: todayISO(), weight: number(values.weight) });
  state.initialized = true;
  saveState();
  document.getElementById('setup-dialog').close();
  renderAll();
  if (!state.goalProfiles.training.carbs) openGoals();
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
  const form = document.getElementById('goals-form');
  fillForm(form, {
    trainingKcal: state.goalProfiles.training.kcal,
    trainingCarbs: state.goalProfiles.training.carbs,
    trainingProtein: state.goalProfiles.training.protein,
    trainingFat: state.goalProfiles.training.fat,
    restKcal: state.goalProfiles.rest.kcal,
    restCarbs: state.goalProfiles.rest.carbs,
    restProtein: state.goalProfiles.rest.protein,
    restFat: state.goalProfiles.rest.fat,
    cycleDay: cycleIndexForDate(),
  });
  openDialog('goals-dialog');
}

document.getElementById('goals-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  state.goalProfiles = {
    training: { kcal: number(values.trainingKcal), carbs: number(values.trainingCarbs), protein: number(values.trainingProtein), fat: number(values.trainingFat) },
    rest: { kcal: number(values.restKcal), carbs: number(values.restCarbs), protein: number(values.restProtein), fat: number(values.restFat) },
  };
  state.goals = { ...state.goalProfiles.training };
  state.trainingCycle = { anchorDate: todayISO(), anchorIndex: number(values.cycleDay), overrides: {} };
  saveState();
  event.currentTarget.closest('dialog').close();
  renderAll();
  showToast('训练日与休息日目标已保存');
});

document.getElementById('day-type-toggle').addEventListener('click', () => {
  const date = todayISO();
  const nextType = dayTypeForDate(date) === 'training' ? 'rest' : 'training';
  state.trainingCycle.overrides[date] = nextType;
  saveState();
  renderAll();
  showToast(`今天已切换为${nextType === 'training' ? '训练日' : '休息日'}`);
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

function openBurn() {
  const form = document.getElementById('burn-form');
  const existing = state.burns.find((item) => item.date === todayISO());
  form.elements.date.value = todayISO();
  form.elements.kcal.value = existing?.kcal || '';
  openDialog('burn-dialog');
}

document.getElementById('burn-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  const existing = state.burns.find((item) => item.date === values.date);
  if (existing) existing.kcal = number(values.kcal);
  else state.burns.push({ id: crypto.randomUUID(), date: values.date, kcal: number(values.kcal) });
  saveState();
  event.currentTarget.closest('dialog').close();
  renderAll();
  showToast('热量消耗已保存');
});

document.querySelectorAll('[data-library-tab]').forEach((button) => button.addEventListener('click', () => {
  libraryFilter = button.dataset.libraryTab;
  renderRecipes();
}));

document.getElementById('library-search').addEventListener('input', (event) => {
  librarySearchQuery = event.target.value;
  document.getElementById('library-search-clear').hidden = !librarySearchQuery;
  renderRecipes();
});
document.getElementById('library-search-clear').addEventListener('click', () => {
  librarySearchQuery = '';
  document.getElementById('library-search').value = '';
  document.getElementById('library-search-clear').hidden = true;
  renderRecipes();
});
document.getElementById('template-search').addEventListener('input', renderQuickLists);
document.querySelectorAll('[data-energy-range]').forEach((button) => button.addEventListener('click', () => {
  energyRange = button.dataset.energyRange;
  renderWeek();
}));
document.querySelectorAll('[data-weight-range]').forEach((button) => button.addEventListener('click', () => {
  weightRange = button.dataset.weightRange;
  renderWeightChart();
}));
document.querySelectorAll('input[name="libraryType"]').forEach((input) => input.addEventListener('change', updateIngredientBasisHint));

document.getElementById('ingredient-log-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const ingredient = [...state.ingredients, ...state.recipes].find((item) => item.id === activeIngredientId);
  if (!ingredient) {
    showToast('找不到这个食材');
    return;
  }
  const values = formValues(event.currentTarget);
  const amount = number(values.amount);
  const factor = ingredient.basis === 'per100g' ? amount / 100 : amount;
  selectedMeal = values.meal;
  addFood({
    name: `${ingredient.name}（${formatNumber(amount, 1)}${ingredient.basis === 'per100g' ? '克' : '份'}）`,
    emoji: ingredient.emoji,
    kcal: number(ingredient.kcal) * factor,
    protein: number(ingredient.protein) * factor,
    carbs: number(ingredient.carbs) * factor,
    fat: number(ingredient.fat) * factor,
  });
  event.currentTarget.closest('dialog').close();
  setView('home');
});

document.getElementById('recipe-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const values = formValues(event.currentTarget);
  const basis = values.libraryType === 'ingredient' ? 'per100g' : 'serving';
  const item = {
    id: editingIngredientId || crypto.randomUUID(),
    name: values.name.trim(),
    emoji: values.emoji.trim() || '🍴',
    basis,
    kcal: number(values.kcal),
    protein: number(values.protein),
    carbs: number(values.carbs),
    fat: number(values.fat),
  };
  // Remove the old copy from both collections first. This also makes changing
  // the type while editing a real move, instead of leaving a duplicate behind.
  state.ingredients = state.ingredients.filter((entry) => entry.id !== editingIngredientId);
  state.recipes = state.recipes.filter((entry) => entry.id !== editingIngredientId);
  if (basis === 'per100g') state.ingredients.unshift(item);
  else state.recipes.unshift(item);
  saveState();
  event.currentTarget.reset();
  event.currentTarget.closest('dialog').close();
  const noun = item.basis === 'per100g' ? '食材' : '食谱';
  libraryFilter = item.basis;
  librarySearchQuery = '';
  document.getElementById('library-search').value = '';
  document.getElementById('library-search-clear').hidden = true;
  renderRecipes();
  showToast(editingIngredientId ? `${noun}已修改` : `${noun}已保存`);
  editingIngredientId = null;
});

document.querySelectorAll('[data-action]').forEach((button) => button.addEventListener('click', () => {
  const action = button.dataset.action;
  if (action === 'profile') openProfile();
  if (action === 'goals') openGoals();
  if (action === 'appearance') openAppearance();
  if (action === 'weight') { setView('diary'); openWeight(); }
  if (action === 'burn') { setView('diary'); openBurn(); }
  if (action === 'weight-view') setView('diary');
  if (action === 'ingredient') openIngredientEditor(null, 'per100g');
  if (action === 'recipe') openIngredientEditor(null, 'serving');
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
    if (![2, 3, 4, 5, 6, 7].includes(imported.version) || !Array.isArray(imported.foods) || !Array.isArray(imported.weights)) throw new Error('invalid');
    const importedGoals = { ...emptyState().goals, ...(imported.goals || {}) };
    const importedLibrary = Array.isArray(imported.recipes) ? imported.recipes : [];
    const importedIngredients = imported.version >= 7 && Array.isArray(imported.ingredients)
      ? imported.ingredients
      : importedLibrary.filter((item) => item.basis === 'per100g');
    const importedRecipes = imported.version >= 7
      ? importedLibrary
      : importedLibrary.filter((item) => item.basis !== 'per100g');
    state = {
      ...emptyState(),
      ...imported,
      version: 7,
      goals: importedGoals,
      goalProfiles: {
        training: { ...importedGoals, ...(imported.goalProfiles?.training || {}) },
        rest: { ...importedGoals, ...(imported.goalProfiles?.rest || {}) },
      },
      trainingCycle: {
        ...emptyState().trainingCycle,
        ...(imported.trainingCycle || {}),
        overrides: { ...(imported.trainingCycle?.overrides || {}) },
      },
      ingredients: importedIngredients.map((item) => ({ ...item, basis: 'per100g' })),
      recipes: importedRecipes.map((item) => ({ ...item, basis: 'serving' })),
      burns: Array.isArray(imported.burns) ? imported.burns : [],
      templates: Array.isArray(imported.templates) ? imported.templates : [],
    };
    ensureStarterIngredients();
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
  if (!confirm('确定清空这台设备上的个人档案、餐食、体重、热量消耗、常用食材和食谱吗？此操作无法撤销。')) return;
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
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
