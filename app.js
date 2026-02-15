const API = "https://connectgo.namecheapkl.workers.dev";
const SHORT_DOMAIN = "https://djx.connectgo.store/";

let TOKEN = localStorage.getItem("token");
let editSlug = null;
window.isAuth = !!TOKEN;

/* =========================
   AUTO LOGIN CHECK
========================= */
if (TOKEN) {
  scheduleAutoLogout(TOKEN);
  showDashboard();
}


/* =========================
   LOGIN
========================= */
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
    window.isAuth = true;

    scheduleAutoLogout(TOKEN);
    showDashboard();
  } catch (err) {
    console.error(err);
    alert("Gagal login, silakan coba lagi.");
  }
}

/* =========================
   LOGOUT
========================= */
function logout() {
  localStorage.removeItem("token");
  TOKEN = null;
  window.isAuth = false;

  document.getElementById("dashboard")?.classList.add("hidden");
  document.getElementById("loginBox")?.classList.remove("hidden");
}

/* =========================
   DASHBOARD
========================= */
function showDashboard() {
  document.getElementById("loginBox")?.classList.add("hidden");
  document.getElementById("dashboard")?.classList.remove("hidden");
  loadLinks();
}

/* =========================
   LOAD LINKS
========================= */
async function loadLinks() {
  try {
    const res = await fetch(API + "/api/links", {
      headers: { Authorization: "Bearer " + TOKEN }
    });

    if (res.status === 401) {
      logout();
      return;
    }

    const links = await res.json();
    const table = document.getElementById("table");
    if (!table) return;
    table.innerHTML = "";

    links.forEach(l => {
      table.innerHTML += `
        <tr class="border-t">
          <td class="p-2">
            <div class="flex items-center gap-1">
              <span class="font-mono">${l.slug}</span>
              <button onclick="copyToClipboard('${l.slug}')" 
                class="text-xs text-gray-500 hover:text-blue-600" title="Copy URL">
                📋
              </button>
            </div>
          </td>
          <td class="p-2 truncate max-w-xs">${l.url}</td>
          <td class="p-2 text-center">${l.clicks}</td>
          <td class="p-2">
            <div class="flex gap-1">
              <a href="${SHORT_DOMAIN}/${l.slug}" 
                 target="_blank" 
                 class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200">
                Buka
              </a>
              <button onclick="openEdit('${l.slug}','${l.url}')"
                class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200">
                Edit
              </button>
              <button onclick="delLink('${l.slug}')"
                class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200">
                Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error("Gagal load links:", err);
  }
}

/* =========================
   COPY LINK
========================= */
function copyToClipboard(slug) {
  const shortUrl = `${SHORT_DOMAIN}/${slug}`;
  try {
    navigator.clipboard.writeText(shortUrl);
    const btn = event.target;
    if (!btn) return;
    const originalText = btn.textContent;
    btn.textContent = "✓";
    btn.className = "text-xs text-green-600 font-bold";
    setTimeout(() => {
      btn.textContent = originalText;
      btn.className = "text-xs text-gray-500 hover:text-blue-600";
    }, 1500);
  } catch (err) {
    console.error("Gagal copy:", err);
    alert("Gagal menyalin link.");
  }
}

/* =========================
   ADD LINK
========================= */
async function addLink() {
  const slug = document.getElementById("slug")?.value.trim();
  const url = document.getElementById("url")?.value.trim();
  if (!slug || !url) return alert("Slug dan URL wajib diisi");
  if (!isValidUrl(url)) return alert("Format URL tidak valid");
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return alert("Slug hanya boleh huruf, angka, _, -");

  try {
    const res = await fetch(API + "/api/links", {
      method: "POST",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ slug, url })
    });

    if (!res.ok) {
      const error = await res.json();
      return alert(error.message || "Gagal menambah link");
    }

    document.getElementById("slug").value = "";
    document.getElementById("url").value = "";
    loadLinks();
    alert(`✅ Link berhasil dibuat!\n${SHORT_DOMAIN}/${slug}`);
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat menambah link");
  }
}

/* =========================
   EDIT LINK
========================= */
function openEdit(slug, url) {
  editSlug = slug;
  const modal = document.getElementById("editModal");
  if (!modal) return;
  document.getElementById("editUrl").value = url;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeEdit() {
  const modal = document.getElementById("editModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  editSlug = null;
}

async function saveEdit() {
  const url = document.getElementById("editUrl")?.value.trim();
  if (!url) return alert("URL tidak boleh kosong");
  if (!isValidUrl(url)) return alert("Format URL tidak valid");

  try {
    const res = await fetch(`${API}/api/links/${editSlug}`, {
      method: "PUT",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ slug: editSlug, url })
    });

    if (!res.ok) {
      const error = await res.json();
      return alert(error.message || "Gagal menyimpan perubahan");
    }

    closeEdit();
    loadLinks();
    alert("✅ Link berhasil diperbarui!");
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat menyimpan perubahan");
  }
}

/* =========================
   DELETE LINK
========================= */
async function delLink(slug) {
  if (!confirm(`Hapus shortlink?\n${SHORT_DOMAIN}/${slug}`)) return;
  try {
    const res = await fetch(`${API}/api/links/${slug}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ slug })
    });

    if (!res.ok) {
      const error = await res.json();
      return alert(error.message || "Gagal menghapus link");
    }

    loadLinks();
    alert("✅ Link berhasil dihapus!");
  } catch (err) {
    console.error(err);
    alert("Terjadi kesalahan saat menghapus link");
  }
}

/* =========================
   AUTO LOGOUT
========================= */
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function scheduleAutoLogout(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return;
  const timeLeft = payload.exp - Math.floor(Date.now() / 1000);
  if (timeLeft <= 0) return logout();

  setTimeout(() => {
    alert("Sesi login habis, silakan login ulang.");
    logout();
  }, timeLeft * 1000);
}

/* =========================
   HELPER FUNCTIONS
========================= */
function isValidUrl(u) {
  try {
    const url = new URL(u);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function getShortUrl(slug) {
  return `${SHORT_DOMAIN}/${slug}`;
}

/* =========================
   ENTER KEY SUPPORT & UI
========================= */
document.addEventListener("DOMContentLoaded", function () {
  ["password", "slug", "url", "editUrl"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("keypress", e => {
      if (e.key !== "Enter") return;
      if (id === "password") login();
      if (id === "slug" || id === "url") addLink();
      if (id === "editUrl") saveEdit();
    });
  });

  const slugInput = document.getElementById("slug");
  if (slugInput) slugInput.addEventListener("input", () => slugInput.title = `${SHORT_DOMAIN}/${slugInput.value.trim()}`);

  const urlInput = document.getElementById("url");
  if (urlInput) urlInput.addEventListener("blur", () => {
    if (urlInput.value && !isValidUrl(urlInput.value)) urlInput.classList.add("border-red-500");
    else urlInput.classList.remove("border-red-500");
  });
});

/* =========================
   QUICK COPY FUNCTION
========================= */
function quickCopy() {
  const slug = document.getElementById("slug")?.value.trim();
  if (!slug) return alert("Masukkan slug terlebih dahulu");
  const shortUrl = `${SHORT_DOMAIN}/${slug}`;
  navigator.clipboard.writeText(shortUrl).then(() => alert(`Copied: ${shortUrl}`)).catch(err => console.error(err));
}
