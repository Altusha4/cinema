function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const navLinksContainer = document.querySelector(".nav-links");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  const currentPath = window.location.pathname;

  if (token) {
    const payload = parseJwt(token);
    const userRole = payload ? (payload.role || "") : "user";

    console.log("🛠️ Role detected:", userRole);

    if (userRole === "admin") {
      const isRoot = currentPath === "/" || currentPath === "/index.html";
      const isSearchPage = currentPath.includes("/pages/index.html") || currentPath.includes("/static/pages/index.html");

      if (isRoot && !isSearchPage) {
        console.log("Redirecting Admin to Admin Panel...");
        window.location.replace("/pages/admin.html");
        return;
      }

      if (navLinksContainer) {
        navLinksContainer.innerHTML = `
            <a href="/pages/admin.html" class="nav-link ${currentPath.includes('admin.html') ? 'active' : ''}">ADMIN PANEL</a>
            <a href="/pages/index.html" class="nav-link ${isSearchPage ? 'active' : ''}">SEARCH</a>
        `;
      }

      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-block";

    } else {
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-block";

      const adminLink = document.getElementById("adminNavLink");
      if (adminLink) adminLink.remove();

      document.querySelectorAll(".user-only").forEach(el => {
        el.style.setProperty('display', 'inline-block', 'important');
      });

      highlightActiveLink();
    }
  } else {
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }
});

function highlightActiveLink() {
  const currentPath = window.location.pathname;
  document.querySelectorAll(".nav-links .nav-link").forEach(link => {
    const linkHref = link.getAttribute("href");

    if (currentPath === linkHref || (currentPath === "/" && linkHref === "/")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

window.goLogin = function() { window.location.href = "/pages/auth.html"; };
window.logout = function() {
  localStorage.clear();
  window.location.href = "/pages/auth.html";
};