// ---- Utilities ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const STORAGE_KEYS = {
  ITEMS: 'zw_items_v1',
  BOOKMARKS: 'zw_bookmarks_v1',
  STATS: 'zw_stats_v1'
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function load(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

// ---- Sample Data (first run only) ----
const SAMPLE_ITEMS = [
  {
    id: uid(),
    title: "Wooden study chair",
    category: "Furniture",
    type: "free",
    location: "600042",
    desc: "Good condition. Pickup near metro. DM in description.",
    img: "assets/placeholder.jpg",
    ts: Date.now() - 1000 * 60 * 60 * 6
  },
  {
    id: uid(),
    title: "Physics books set (XI-XII)",
    category: "Books",
    type: "donate",
    location: "560001",
    desc: "Complete set, lightly used.",
    img: "assets/placeholder.jpg",
    ts: Date.now() - 1000 * 60 * 60 * 30
  },
  {
    id: uid(),
    title: "Mixer jar (needs blade)",
    category: "Kitchen",
    type: "swap",
    location: "600040",
    desc: "Swap for any stainless bottle.",
    img: "assets/placeholder.jpg",
    ts: Date.now() - 1000 * 60 * 60 * 54
  },
  {
    id: uid(),
    title: "Old T-shirts for crafts",
    category: "Clothing",
    type: "free",
    location: "400001",
    desc: "Great for rags or DIY.",
    img: "assets/placeholder.jpg",
    ts: Date.now() - 1000 * 60 * 60 * 80
  },
  {
    id: uid(),
    title: "USB keyboard",
    category: "Electronics",
    type: "free",
    location: "641001",
    desc: "Fully working. Pickup weekends.",
    img: "assets/placeholder.jpg",
    ts: Date.now() - 1000 * 60 * 60 * 100
  }
];

function ensureSeed() {
  let items = load(STORAGE_KEYS.ITEMS, null);
  if (!items) {
    save(STORAGE_KEYS.ITEMS, SAMPLE_ITEMS);
    save(STORAGE_KEYS.BOOKMARKS, []);
    save(STORAGE_KEYS.STATS, { items: 5, people: 5, co2: 36 });
  }
}
ensureSeed();

// ---- State ----
let ITEMS = load(STORAGE_KEYS.ITEMS, []);
let BOOKMARKS = new Set(load(STORAGE_KEYS.BOOKMARKS, []));
let STATS = load(STORAGE_KEYS.STATS, { items: 0, people: 0, co2: 0 });

const state = {
  q: "",
  category: "",
  location: "",
  tab: "all",
  onlyNearby: false
};

// ---- DOM Refs ----
const grid = $("#grid");
const empty = $("#empty");

function formatType(t){
  return t[0].toUpperCase() + t.slice(1);
}

// ---- Rendering ----
function renderStats(){
  $("#statItems").textContent = STATS.items.toString();
  $("#statPeople").textContent = STATS.people.toString();
  $("#statCO2").textContent = STATS.co2.toString();
}

function cardTemplate(item){
  const bookmarked = BOOKMARKS.has(item.id);
  return `
  <article class="card" data-id="${item.id}">
    <img class="card__img" src="${item.img}" alt="${item.title}" loading="lazy">
    <div class="badges">
      <span class="badge badge--type">${formatType(item.type)}</span>
      <span class="badge">${item.category}</span>
      <span class="badge">📍 ${item.location}</span>
    </div>
    <h4>${item.title}</h4>
    <p>${item.desc ?? ""}</p>
    <div class="card__foot">
      <small>${timeAgo(item.ts)}</small>
      <button class="icon-btn bookmark" aria-pressed="${bookmarked ? "true" : "false"}" title="Bookmark">★</button>
    </div>
  </article>
  `;
}

function timeAgo(ts){
  const s = Math.floor((Date.now() - ts)/1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s/60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h/24);
  return `${d}d ago`;
}

function passesFilters(item){
  if (state.tab !== "all" && item.type !== state.tab) return false;

  const q = state.q.trim().toLowerCase();
  if (q){
    const hay = `${item.title} ${item.desc ?? ""} ${item.category}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }

  if (state.category && item.category !== state.category) return false;

  const loc = state.location.trim();
  if (loc){
    // Simple "nearby" check: startsWith or equality (pincode or substring)
    const near = item.location.toString().startsWith(loc) || item.location.toString() === loc;
    if (state.onlyNearby && !near) return false;
    // If not "only nearby", location acts as a loose text filter:
    if (!state.onlyNearby && !(item.location.toString().includes(loc))) return false;
  }

  return true;
}

function renderGrid(){
  const items = ITEMS
    .slice()
    .sort((a,b)=>b.ts - a.ts)
    .filter(passesFilters);

  grid.innerHTML = items.map(cardTemplate).join("");

  empty.classList.toggle("hidden", items.length > 0);

  // bind bookmark buttons
  $$(".bookmark").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.closest(".card").dataset.id;
      toggleBookmark(id);
      btn.setAttribute("aria-pressed", BOOKMARKS.has(id) ? "true" : "false");
    });
  });
}

function toggleBookmark(id){
  if (BOOKMARKS.has(id)) BOOKMARKS.delete(id);
  else BOOKMARKS.add(id);
  save(STORAGE_KEYS.BOOKMARKS, Array.from(BOOKMARKS));
}

function openBookmarks(){
  const list = ITEMS.filter(x=>BOOKMARKS.has(x.id));
  $("#bookmarksGrid").innerHTML = list.map(cardTemplate).join("") || `<div class="empty"><p>No bookmarks yet.</p></div>`;
  $("#bookmarksModal").showModal();
}

// ---- Events: search + filters ----
$("#doSearch").addEventListener("click", ()=>{
  state.q = $("#q").value;
  state.category = $("#category").value;
  state.location = $("#location").value;
  renderGrid();
});

$("#q").addEventListener("keydown", (e)=>{ if (e.key === "Enter") $("#doSearch").click(); });

$("#category").addEventListener("change", ()=>{
  state.category = $("#category").value;
});

$("#onlyNearby").addEventListener("change", (e)=>{
  state.onlyNearby = e.target.checked;
  renderGrid();
});

$$(".tab").forEach(t=>{
  t.addEventListener("click", ()=>{
    $$(".tab").forEach(x=>x.classList.remove("is-active"));
    t.classList.add("is-active");
    state.tab = t.dataset.filter;
    renderGrid();
  });
});

// ---- Post modal ----
const postModal = $("#postModal");
$("#openPost").addEventListener("click", ()=> postModal.showModal());
$("#closePost").addEventListener("click", ()=> postModal.close());

$("#postForm").addEventListener("submit", async (e)=>{
  e.preventDefault();

  const fd = new FormData(e.target);
  const title = (fd.get("title") || "").toString().trim();
  const category = fd.get("category");
  const type = fd.get("type");
  const location = (fd.get("location") || "").toString().trim();
  const desc = (fd.get("desc") || "").toString().trim();
  const file = fd.get("photo");

  if (!title || !category || !type || !location){
    alert("Please fill the required fields.");
    return;
  }

  let img = "assets/placeholder.jpg";
  if (file && file.size){
    img = await readFileAsDataURL(file);
  }

  const item = { id: uid(), title, category, type, location, desc, img, ts: Date.now() };
  ITEMS.push(item);
  save(STORAGE_KEYS.ITEMS, ITEMS);

  // Update stats (simple heuristic)
  STATS.items += 1;
  STATS.people += 1;
  STATS.co2 += 5; // pretend each item avoids ~5 kg CO2
  save(STORAGE_KEYS.STATS, STATS);

  renderStats();
  renderGrid();
  postModal.close();
  e.target.reset();
});

function readFileAsDataURL(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ---- Bookmarks modal ----
$("#openBookmarks").addEventListener("click", openBookmarks);
$("#closeBookmarks").addEventListener("click", ()=> $("#bookmarksModal").close());

// ---- Footer year ----
$("#year").textContent = new Date().getFullYear().toString();

// ---- First render ----
renderStats();
renderGrid();
