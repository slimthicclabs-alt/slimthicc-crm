const stages = ["Prospect", "Contacted", "Sample Sent", "Negotiating", "Stockist"];
const storageKey = "slimthicc-store-crm";
const apiEndpoint = "/api/stores";

function makeId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `store-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const sampleStores = [
  {
    id: makeId(),
    name: "Glow Market",
    contact: "Maya Torres",
    email: "maya@glowmarket.example",
    phone: "(212) 555-0194",
    city: "New York",
    region: "Northeast",
    stage: "Negotiating",
    priority: "Hot",
    nextFollowUp: offsetDate(1),
    monthlyOrder: 4200,
    health: 82,
    buyerType: "Buyer",
    notes: "Interested in peach, cocoa, and berry display sets. Wants margin sheet before Friday."
  },
  {
    id: makeId(),
    name: "Curve Room Boutique",
    contact: "Janelle Price",
    email: "janelle@curveroom.example",
    phone: "(404) 555-0148",
    city: "Atlanta",
    region: "Southeast",
    stage: "Sample Sent",
    priority: "Warm",
    nextFollowUp: offsetDate(3),
    monthlyOrder: 2600,
    health: 71,
    buyerType: "Owner",
    notes: "Sent starter kit and sizing card. Ask about counter display space."
  },
  {
    id: makeId(),
    name: "The Fit Edit",
    contact: "Samira Akhtar",
    email: "samira@fitedit.example",
    phone: "(312) 555-0116",
    city: "Chicago",
    region: "Midwest",
    stage: "Contacted",
    priority: "Hot",
    nextFollowUp: offsetDate(0),
    monthlyOrder: 1800,
    health: 64,
    buyerType: "Manager",
    notes: "DM reply was strong. Needs wholesale one-sheet and founder story."
  },
  {
    id: makeId(),
    name: "Sunset Supply",
    contact: "Leo Chen",
    email: "leo@sunsetsupply.example",
    phone: "(323) 555-0162",
    city: "Los Angeles",
    region: "West",
    stage: "Stockist",
    priority: "Warm",
    nextFollowUp: offsetDate(7),
    monthlyOrder: 6400,
    health: 91,
    buyerType: "Owner",
    notes: "First PO landed. Check sell-through after weekend rush and propose replenishment cadence."
  },
  {
    id: makeId(),
    name: "Muse Pharmacy",
    contact: "Erica Dunn",
    email: "erica@musepharmacy.example",
    phone: "(617) 555-0188",
    city: "Boston",
    region: "Northeast",
    stage: "Prospect",
    priority: "Watch",
    nextFollowUp: offsetDate(10),
    monthlyOrder: 1200,
    health: 45,
    buyerType: "Distributor",
    notes: "Good neighborhood fit. Need buyer intro from wellness category manager."
  }
];

let stores = [];
let activeView = "pipeline";
let activeFilter = "all";
let sharedMode = false;

const elements = {
  search: document.querySelector("#search-input"),
  region: document.querySelector("#region-filter"),
  board: document.querySelector("#pipeline-board"),
  accounts: document.querySelector("#accounts-table"),
  tasks: document.querySelector("#tasks-list"),
  dialog: document.querySelector("#store-dialog"),
  form: document.querySelector("#store-form"),
  health: document.querySelector("#health"),
  healthValue: document.querySelector("#health-value"),
  deleteButton: document.querySelector("#delete-store-button"),
  dialogTitle: document.querySelector("#dialog-title"),
  syncStatus: document.querySelector("#sync-status")
};

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function loadStores() {
  if (window.location.protocol.startsWith("http")) {
    try {
      const response = await fetch(apiEndpoint, { cache: "no-store" });
      if (response.ok) {
        sharedMode = true;
        const sharedStores = await response.json();
        if (sharedStores.length > 0) return sharedStores;
        await replaceSharedStores(sampleStores);
        return sampleStores;
      }
    } catch (error) {
      console.warn("Shared CRM storage unavailable, using this browser only.", error);
    }
  }

  sharedMode = false;
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : sampleStores;
}

function saveStores() {
  localStorage.setItem(storageKey, JSON.stringify(stores));
}

async function replaceSharedStores(nextStores) {
  const response = await fetch(apiEndpoint, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(nextStores)
  });
  if (!response.ok) throw new Error("Unable to update shared CRM data.");
}

async function saveStoreToSharedData(store) {
  const response = await fetch(apiEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(store)
  });
  if (!response.ok) throw new Error("Unable to save store to shared CRM data.");
  stores = await response.json();
}

async function deleteStoreFromSharedData(id) {
  const response = await fetch(`${apiEndpoint}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!response.ok) throw new Error("Unable to delete store from shared CRM data.");
  stores = await response.json();
}

async function refreshSharedData() {
  if (!sharedMode || elements.dialog.open) return;
  try {
    const response = await fetch(apiEndpoint, { cache: "no-store" });
    if (!response.ok) throw new Error("Refresh failed");
    const nextStores = await response.json();
    if (JSON.stringify(nextStores) !== JSON.stringify(stores)) {
      stores = nextStores;
      render();
    }
    updateSyncStatus("Shared", "shared");
  } catch (error) {
    updateSyncStatus("Sync issue", "error");
  }
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isDue(store) {
  if (!store.nextFollowUp) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${store.nextFollowUp}T00:00:00`) <= today;
}

function currentStores() {
  const term = elements.search.value.trim().toLowerCase();
  const region = elements.region.value;

  return stores.filter((store) => {
    const matchesTerm = [store.name, store.contact, store.city, store.region, store.notes]
      .join(" ")
      .toLowerCase()
      .includes(term);
    const matchesRegion = region === "all" || store.region === region;
    const matchesFilter =
      activeFilter === "all" ||
      (activeFilter === "hot" && store.priority === "Hot") ||
      (activeFilter === "due" && isDue(store)) ||
      (activeFilter === "buyer" && ["Buyer", "Distributor"].includes(store.buyerType));

    return matchesTerm && matchesRegion && matchesFilter;
  });
}

function render() {
  renderRegions();
  renderMetrics();
  renderPipeline();
  renderAccounts();
  renderTasks();
}

function updateSyncStatus(label, tone) {
  elements.syncStatus.textContent = label;
  elements.syncStatus.className = `sync-badge ${tone}`;
}

function renderRegions() {
  const selected = elements.region.value || "all";
  const regions = [...new Set(stores.map((store) => store.region))].sort();
  elements.region.innerHTML = `<option value="all">All regions</option>${regions
    .map((region) => `<option value="${escapeHtml(region)}">${escapeHtml(region)}</option>`)
    .join("")}`;
  elements.region.value = regions.includes(selected) ? selected : "all";
}

function renderMetrics() {
  const activeStores = stores.filter((store) => store.stage !== "Prospect").length;
  const monthly = stores.reduce((total, store) => total + Number(store.monthlyOrder || 0), 0);
  const followups = stores.filter(isDue).length;
  const samples = stores.filter((store) => store.stage === "Sample Sent").length;
  const orders = stores.filter((store) => store.stage === "Stockist" || store.stage === "Negotiating").length;
  const avgHealth = stores.length
    ? Math.round(stores.reduce((total, store) => total + Number(store.health || 0), 0) / stores.length)
    : 0;

  document.querySelector("#metric-active").textContent = activeStores;
  document.querySelector("#metric-monthly").textContent = money(monthly);
  document.querySelector("#stat-followups").textContent = followups;
  document.querySelector("#stat-samples").textContent = samples;
  document.querySelector("#stat-orders").textContent = orders;
  document.querySelector("#stat-health").textContent = `${avgHealth}%`;
}

function renderPipeline() {
  const visible = currentStores();
  elements.board.innerHTML = stages
    .map((stage) => {
      const stageStores = visible.filter((store) => store.stage === stage);
      const cards =
        stageStores
          .map(
            (store) => `
              <button class="store-card" type="button" data-id="${store.id}">
                <h4>${escapeHtml(store.name)}</h4>
                <p>${escapeHtml(store.city)} · ${escapeHtml(store.contact)}</p>
                <div class="health-meter" aria-label="Relationship health ${store.health}%">
                  <span style="width: ${store.health}%"></span>
                </div>
                <div class="card-meta">
                  <span class="priority-pill priority-${store.priority.toLowerCase()}">${store.priority}</span>
                  <span class="due-pill">${formatDate(store.nextFollowUp)}</span>
                  <span class="stage-pill">${money(store.monthlyOrder)}</span>
                </div>
              </button>
            `
          )
          .join("") || `<div class="empty-state">No stores here yet</div>`;

      return `
        <section class="stage-column">
          <div class="stage-header">
            <h3>${stage}</h3>
            <span class="count-pill">${stageStores.length}</span>
          </div>
          ${cards}
        </section>
      `;
    })
    .join("");
}

function renderAccounts() {
  const visible = currentStores();
  elements.accounts.innerHTML =
    visible
      .map(
        (store) => `
          <tr>
            <td><button class="table-button" type="button" data-id="${store.id}">${escapeHtml(store.name)}</button><br><small>${escapeHtml(store.city)}</small></td>
            <td>${escapeHtml(store.contact)}<br><small>${escapeHtml(store.email || "No email")}</small></td>
            <td>${escapeHtml(store.stage)}</td>
            <td>${escapeHtml(store.region)}</td>
            <td>${formatDate(store.nextFollowUp)}<br><small>${escapeHtml(store.notes || "")}</small></td>
            <td>${money(store.monthlyOrder)}</td>
          </tr>
        `
      )
      .join("") || `<tr><td colspan="6">No matching stores.</td></tr>`;
}

function renderTasks() {
  const sorted = [...currentStores()].sort((a, b) => (a.nextFollowUp || "").localeCompare(b.nextFollowUp || ""));
  elements.tasks.innerHTML =
    sorted
      .map(
        (store) => `
          <article class="task-item">
            <div>
              <h4>${escapeHtml(store.name)}</h4>
              <p>${escapeHtml(store.contact)} · ${escapeHtml(store.notes || "No notes yet.")}</p>
            </div>
            <span class="priority-pill priority-${store.priority.toLowerCase()}">${store.priority}</span>
            <button class="secondary-button" type="button" data-id="${store.id}">${formatDate(store.nextFollowUp)}</button>
          </article>
        `
      )
      .join("") || `<div class="empty-state">No follow-up tasks match your filters.</div>`;
}

function openStore(id) {
  const store = stores.find((item) => item.id === id);
  elements.form.reset();
  elements.deleteButton.hidden = !store;
  elements.dialogTitle.textContent = store ? "Edit Store" : "Add Store";

  const values = store || {
    id: "",
    name: "",
    contact: "",
    email: "",
    phone: "",
    city: "",
    region: "",
    stage: "Prospect",
    priority: "Warm",
    nextFollowUp: offsetDate(2),
    monthlyOrder: 0,
    health: 70,
    buyerType: "Owner",
    notes: ""
  };

  document.querySelector("#store-id").value = values.id;
  document.querySelector("#store-name").value = values.name;
  document.querySelector("#contact-name").value = values.contact;
  document.querySelector("#contact-email").value = values.email;
  document.querySelector("#contact-phone").value = values.phone;
  document.querySelector("#city").value = values.city;
  document.querySelector("#region").value = values.region;
  document.querySelector("#stage").value = values.stage;
  document.querySelector("#priority").value = values.priority;
  document.querySelector("#next-follow-up").value = values.nextFollowUp;
  document.querySelector("#monthly-order").value = values.monthlyOrder;
  document.querySelector("#health").value = values.health;
  document.querySelector("#buyer-type").value = values.buyerType;
  document.querySelector("#notes").value = values.notes;
  elements.healthValue.textContent = `${values.health}%`;
  elements.dialog.showModal();
}

function formValue(id) {
  return document.querySelector(id).value.trim();
}

async function saveFromForm() {
  const id = formValue("#store-id") || makeId();
  const updated = {
    id,
    name: formValue("#store-name"),
    contact: formValue("#contact-name"),
    email: formValue("#contact-email"),
    phone: formValue("#contact-phone"),
    city: formValue("#city"),
    region: formValue("#region"),
    stage: formValue("#stage"),
    priority: formValue("#priority"),
    nextFollowUp: formValue("#next-follow-up"),
    monthlyOrder: Number(formValue("#monthly-order") || 0),
    health: Number(formValue("#health") || 0),
    buyerType: formValue("#buyer-type"),
    notes: formValue("#notes")
  };

  const existingIndex = stores.findIndex((store) => store.id === id);
  if (existingIndex >= 0) {
    stores[existingIndex] = updated;
  } else {
    stores.unshift(updated);
  }

  try {
    if (sharedMode) {
      await saveStoreToSharedData(updated);
      updateSyncStatus("Shared", "shared");
    } else {
      saveStores();
      updateSyncStatus("This browser", "local");
    }
    render();
  } catch (error) {
    updateSyncStatus("Not saved", "error");
    throw error;
  }
}

async function deleteCurrentStore() {
  const id = formValue("#store-id");
  if (!id) return;
  stores = stores.filter((store) => store.id !== id);
  try {
    if (sharedMode) {
      await deleteStoreFromSharedData(id);
      updateSyncStatus("Shared", "shared");
    } else {
      saveStores();
      updateSyncStatus("This browser", "local");
    }
    render();
    elements.dialog.close();
  } catch (error) {
    updateSyncStatus("Not deleted", "error");
  }
}

function exportCsv() {
  const headers = [
    "Store",
    "Contact",
    "Email",
    "Phone",
    "City",
    "Region",
    "Stage",
    "Priority",
    "Next Follow-Up",
    "Projected Monthly",
    "Health",
    "Buyer Type",
    "Notes"
  ];
  const rows = stores.map((store) => [
    store.name,
    store.contact,
    store.email,
    store.phone,
    store.city,
    store.region,
    store.stage,
    store.priority,
    store.nextFollowUp,
    store.monthlyOrder,
    store.health,
    store.buyerType,
    store.notes
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "slimthicc-store-crm.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelector("#new-store-button").addEventListener("click", () => openStore());
document.querySelector("#export-button").addEventListener("click", exportCsv);

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item === button));
    document.querySelectorAll(".view-panel").forEach((panel) => panel.classList.remove("active"));
    document.querySelector(`#${activeView}-view`).classList.add("active");
    document.querySelector("#view-title").textContent = button.textContent.trim();
  });
});

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
    render();
  });
});

elements.search.addEventListener("input", render);
elements.region.addEventListener("change", render);
elements.health.addEventListener("input", () => {
  elements.healthValue.textContent = `${elements.health.value}%`;
});

document.addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-id]");
  if (openButton) openStore(openButton.dataset.id);
});

elements.form.addEventListener("submit", (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  saveFromForm()
    .then(() => elements.dialog.close())
    .catch(() => {});
});

elements.deleteButton.addEventListener("click", deleteCurrentStore);

async function startApp() {
  stores = await loadStores();
  updateSyncStatus(sharedMode ? "Shared" : "This browser", sharedMode ? "shared" : "local");
  render();
  if (sharedMode) {
    window.setInterval(refreshSharedData, 5000);
  }
}

startApp();
