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

function dueDays(value) {
  const match = String(value || "").match(/D\+(\d+)/i);
  return match ? Number(match[1]) : 99;
}

function getStats() {
  const total = records.length;
  const open = records.filter((record) => !record.done).length;
  const highRisk = records.filter((record) => !record.done && record.priority === "high").length;
  const mediumRisk = records.filter((record) => !record.done && record.priority === "medium").length;
  const lowRisk = records.filter((record) => !record.done && record.priority === "low").length;
  const urgent = records.filter((record) => !record.done && dueDays(record.due) <= 3).length;
  const done = records.filter((record) => record.done).length;
  const doneRate = total ? Math.round((done / total) * 100) : 0;
  const avgScore = total ? Math.round(records.reduce((sum, record) => sum + Number(record.score || 0), 0) / total) : 0;
  const automationRate = total ? Math.min(98, Math.round(54 + doneRate * 0.22 + avgScore * 0.22)) : 0;
  const savedHours = Math.max(1, Math.round((open * 0.9 + done * 0.45 + highRisk * 0.8) * 10) / 10);
  const improvementCount = highRisk + mediumRisk + urgent;
  return { total, open, highRisk, mediumRisk, lowRisk, urgent, done, doneRate, avgScore, automationRate, savedHours, improvementCount };
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
  const urgent = openRecords.filter((record) => dueDays(record.due) <= 3).length;
  return `優先處理「${top.title}」：${top.risk} 分數 ${top.score}。目前最多風險集中在「${mainRisk[0]}」(${mainRisk[1]} 筆)，另有 ${urgent} 筆急件，建議由 ${top.owner} 先確認資料與下一步責任。`;
}

function renderStats() {
  const stats = getStats();
  $("#openCount").textContent = stats.open;
  $("#riskCount").textContent = stats.highRisk;
  $("#doneRate").textContent = `${stats.doneRate}%`;
  $("#totalCount").textContent = stats.total;
  $("#avgScore").textContent = stats.avgScore;
  $("#urgentCount").textContent = stats.urgent;
  $("#queueLabel").textContent = `${records.length} items`;
  $("#aiInsight").textContent = generateInsight();
}

function renderAnalytics() {
  const stats = getStats();
  const maxRisk = Math.max(stats.highRisk, stats.mediumRisk, stats.lowRisk, 1);
  const rows = [
    ["高風險", stats.highRisk, "high"],
    ["中風險", stats.mediumRisk, "medium"],
    ["低風險", stats.lowRisk, "low"],
    ["急件", stats.urgent, "urgent"],
  ];
  $("#riskBars").innerHTML = rows.map(([label, count, key]) => {
    const width = Math.max(8, Math.round((count / maxRisk) * 100));
    return `<div class="risk-row" data-risk="${key}"><span>${label}</span><div class="risk-track"><i class="risk-fill" style="width:${width}%"></i></div><b>${count}</b></div>`;
  }).join("");
  $("#savedHours").textContent = `${stats.savedHours}h`;
  $("#automationRate").textContent = `${stats.automationRate}%`;
  $("#improvementCount").textContent = stats.improvementCount;
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
  renderAnalytics();
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