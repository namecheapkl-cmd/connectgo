const API = "https://connect.namecheapkl.workers.dev";
const SHORT_DOMAIN = "https://lynkz.site/";

let TOKEN = localStorage.getItem("token");
let editSlug = null;
window.isAuth = !!TOKEN;

/* ================= AUTO LOGIN ================= */
if (TOKEN) {
  scheduleAutoLogout(TOKEN);
  showDashboard();
}

/* ================= LOGIN ================= */
async function login() {
  const password = document.getElementById("password")?.value;
  if (!password) return;

  try {
    const res = await fetch(API + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!res.ok) {
      document.getElementById("loginError")?.classList.remove("hidden");
      return;
    }

    const data = await res.json();
    TOKEN = data.token;
    localStorage.setItem("token", TOKEN);

    scheduleAutoLogout(TOKEN);
    showDashboard();

  } catch (err) {
    console.error(err);
    alert("Gagal login");
  }
}

/* ================= LOGOUT ================= */
function logout() {
  localStorage.removeItem("token");
  TOKEN = null;

  document.getElementById("dashboard")?.classList.add("hidden");
  document.getElementById("loginBox")?.classList.remove("hidden");
}

/* ================= DASHBOARD ================= */
function showDashboard() {
  document.getElementById("loginBox")?.classList.add("hidden");
  document.getElementById("dashboard")?.classList.remove("hidden");
  loadLinks();
}

/* ================= LOAD LINKS ================= */
async function loadLinks() {
  try {
    const res = await fetch(API + "/api/links", {
      headers: { Authorization: "Bearer " + TOKEN }
    });

    if (res.status === 401) return logout();

    const links = await res.json();
    const table = document.getElementById("table");
    table.innerHTML = "";

    links.forEach(l => {
      table.innerHTML += `
        <tr class="border-t">
          <td class="p-2">
            <span class="font-mono">${l.slug}</span>
            <button onclick="copyToClipboard('${l.slug}', this)" class="ml-2 text-xs">📋</button>
          </td>
          <td class="p-2 truncate">${l.url}</td>
          <td class="p-2 text-center">${l.clicks || 0}</td>
          <td class="p-2">
            <a href="${SHORT_DOMAIN}/${l.slug}" target="_blank">Buka</a>
            <button onclick="openEdit('${l.slug}','${l.url}')">Edit</button>
            <button onclick="delLink('${l.slug}')">Hapus</button>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error(err);
  }
}

/* ================= COPY ================= */
function copyToClipboard(slug, el) {
  const shortUrl = `${SHORT_DOMAIN}/${slug}`;
  navigator.clipboard.writeText(shortUrl);

  if (!el) return;
  const original = el.textContent;
  el.textContent = "✓";

  setTimeout(() => {
    el.textContent = original;
  }, 1500);
}

/* ================= ADD LINK ================= */
async function addLink() {
  const slug = document.getElementById("slug")?.value.trim();
  const url = document.getElementById("url")?.value.trim();

  if (!slug || !url) return alert("Slug & URL wajib");
  if (!isValidUrl(url)) return alert("URL tidak valid");

  try {
    const res = await fetch(API + "/api/links", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ slug, url })
    });

    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Gagal");
    }

    document.getElementById("slug").value = "";
    document.getElementById("url").value = "";

    loadLinks();
    alert("Link berhasil dibuat");

  } catch (err) {
    console.error(err);
    alert("Error");
  }
}

/* ================= EDIT ================= */
function openEdit(slug, url) {
  editSlug = slug;
  document.getElementById("editUrl").value = url;
  document.getElementById("editModal").classList.remove("hidden");
}

function closeEdit() {
  document.getElementById("editModal").classList.add("hidden");
  editSlug = null;
}

async function saveEdit() {
  const url = document.getElementById("editUrl")?.value.trim();

  if (!url) return alert("URL kosong");

  try {
    const res = await fetch(`${API}/api/links`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ slug: editSlug, url })
    });

    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Gagal update");
    }

    closeEdit();
    loadLinks();
    alert("Berhasil update");

  } catch (err) {
    console.error(err);
  }
}

/* ================= DELETE ================= */
async function delLink(slug) {
  if (!confirm("Hapus link?")) return;

  try {
    const res = await fetch(`${API}/api/links`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ slug })
    });

    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Gagal hapus");
    }

    loadLinks();
    alert("Berhasil dihapus");

  } catch (err) {
    console.error(err);
  }
}

/* ================= AUTO LOGOUT ================= */
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

function scheduleAutoLogout(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return;

  const timeout = payload.exp * 1000 - Date.now();

  setTimeout(() => {
    alert("Session habis");
    logout();
  }, timeout);
}

/* ================= HELPER ================= */
function isValidUrl(u) {
  try {
    const url = new URL(u);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}
