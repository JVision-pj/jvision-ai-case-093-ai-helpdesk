(function interactiveAppSource() {
const config = window.DEMO_CONFIG;
const storageKey = "jvision-demo-" + config.id;
const $ = (selector) => document.querySelector(selector);

function loadRecords() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : structuredClone(config.records);
  } catch {
    return structuredClone(config.records);
  }
}

let records = loadRecords();

function saveRecords() {
  localStorage.setItem(storageKey, JSON.stringify(records));
}

function getStats() {
  const open = records.filter((record) => !record.done).length;
  const highRisk = records.filter((record) => !record.done && record.priority === "high").length;
  const done = records.filter((record) => record.done).length;
  const doneRate = records.length ? Math.round((done / records.length) * 100) : 0;
  return { open, highRisk, doneRate };
}

function generateInsight() {
  const openRecords = records.filter((record) => !record.done).sort((a, b) => b.score - a.score);
  if (!openRecords.length) return "所有項目都已完成。建議匯出今日摘要，沉澱成 SOP 與下次改善清單。";
  const top = openRecords[0];
  const grouped = openRecords.reduce((acc, record) => {
    acc[record.risk] = (acc[record.risk] || 0) + 1;
    return acc;
  }, {});
  const mainRisk = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0];
  return `優先處理「${top.title}」：${top.risk} 分數 ${top.score}。目前最多風險集中在「${mainRisk[0]}」(${mainRisk[1]} 筆)，建議由 ${top.owner} 先確認資料與下一步責任。`;
}

function renderStats() {
  const stats = getStats();
  $("#openCount").textContent = stats.open;
  $("#riskCount").textContent = stats.highRisk;
  $("#doneRate").textContent = `${stats.doneRate}%`;
  $("#queueLabel").textContent = `${records.length} items`;
  $("#aiInsight").textContent = generateInsight();
}

function renderBoard() {
  const board = $("#stageBoard");
  board.innerHTML = "";
  config.profile.stages.forEach((stage) => {
    const count = records.filter((record) => record.stage === stage).length;
    const percent = records.length ? Math.round((count / records.length) * 100) : 0;
    const card = document.createElement("article");
    card.className = "stage";
    card.innerHTML = `<strong>${stage}<span>${count}</span></strong><i style="width:${Math.max(percent, 8)}%"></i>`;
    board.append(card);
  });
}

function renderTasks() {
  const list = $("#taskList");
  list.innerHTML = "";
  const sorted = [...records].sort((a, b) => Number(a.done) - Number(b.done) || b.score - a.score);
  if (!sorted.length) {
    list.innerHTML = `<div class="empty">目前沒有資料，新增一筆${config.profile.object}開始體驗。</div>`;
    return;
  }
  sorted.forEach((record) => {
    const card = document.createElement("article");
    card.className = "task-card";
    card.classList.toggle("done", record.done);
    card.innerHTML = `
      <header>
        <h3>${record.title}</h3>
        <span class="pill ${record.priority}">${record.priority === "high" ? "高風險" : record.priority === "medium" ? "中風險" : "低風險"}</span>
      </header>
      <p>${record.target}</p>
      <div class="task-meta">
        <span>${config.profile.fields[1]}：${record.due}</span>
        <span>${config.profile.fields[2]}：${record.risk}</span>
        <span>${config.profile.fields[3]}：${record.owner}</span>
        <span>AI 分數：${record.score}</span>
      </div>
      <button type="button" data-id="${record.id}">${record.done ? "改回待辦" : "標記完成"}</button>
    `;
    list.append(card);
  });
}

function render() {
  renderStats();
  renderBoard();
  renderTasks();
}

document.querySelectorAll("[data-action='run-ai']").forEach((button) => {
  button.addEventListener("click", () => {
    records = records.map((record) => record.done ? record : {
      ...record,
      score: Math.min(99, record.score + Math.floor(Math.random() * 7)),
      priority: record.score > 72 ? "high" : record.score > 54 ? "medium" : "low",
    });
    saveRecords();
    render();
  });
});

$("[data-action='reset']").addEventListener("click", () => {
  records = structuredClone(config.records);
  saveRecords();
  render();
});

$("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const score = 62 + Math.floor(Math.random() * 30);
  records.unshift({
    id: `${config.id}-${Date.now()}`,
    title: form.get("title").trim(),
    target: form.get("target").trim(),
    owner: config.profile.owner,
    due: "D+3",
    risk: form.get("risk"),
    stage: config.profile.stages[0],
    score,
    priority: score >= 78 ? "high" : "medium",
    done: false,
  });
  event.currentTarget.reset();
  saveRecords();
  render();
});

$("#taskList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  records = records.map((record) => record.id === button.dataset.id ? {
    ...record,
    done: !record.done,
    stage: !record.done ? config.profile.stages.at(-1) : config.profile.stages[1],
  } : record);
  saveRecords();
  render();
});

render();
})();