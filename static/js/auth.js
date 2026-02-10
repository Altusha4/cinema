console.log("auth.js LOADED");

function showError(input, message) {
  input.classList.add("invalid");
  input.classList.remove("valid");

  let error = input.nextElementSibling;
  if (!error || !error.classList.contains("error-text")) {
    error = document.createElement("div");
    error.className = "error-text";
    input.after(error);
  }
  error.textContent = message;
}

function showSuccess(input) {
  input.classList.remove("invalid");
  input.classList.add("valid");

  const error = input.nextElementSibling;
  if (error && error.classList.contains("error-text")) {
    error.remove();
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return password.length >= 8;
}

function isValidUsername(username) {
  return username.length >= 3;
}

function getRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch (e) {
    return 'user';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("auth.js ready");

  const statusEl = document.getElementById("status");
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");

  if (loginTab && registerTab) {
    loginTab.onclick = () => {
      loginForm.style.display = "block";
      registerForm.style.display = "none";
      loginTab.classList.add("active");
      registerTab.classList.remove("active");
      statusEl.textContent = "";
    };

    registerTab.onclick = () => {
      loginForm.style.display = "none";
      registerForm.style.display = "block";
      registerTab.classList.add("active");
      loginTab.classList.remove("active");
      statusEl.textContent = "";
    };
  }

  if (loginBtn) {
    loginBtn.onclick = async () => {
      console.log("LOGIN CLICK");

      const emailInput = document.getElementById("loginEmail");
      const passwordInput = document.getElementById("loginPassword");

      let ok = true;

      if (!isValidEmail(emailInput.value)) {
        showError(emailInput, "Invalid email format");
        ok = false;
      } else {
        showSuccess(emailInput);
      }

      if (!isValidPassword(passwordInput.value)) {
        showError(passwordInput, "Password must be at least 8 characters");
        ok = false;
      } else {
        showSuccess(passwordInput);
      }

      if (!ok) return;

      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailInput.value,
            password: passwordInput.value
          })
        });

        const data = await res.json();

        if (res.ok && data.token) {
          localStorage.clear();
          localStorage.setItem("token", data.token);

          const userRole = data.role || getRoleFromToken(data.token);

          if (userRole === "admin") {
            window.location.href = "/pages/admin.html";
          } else {
            window.location.href = "/";
          }
        } else {
          statusEl.textContent = data.error || "Login failed";
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Server error";
      }
    };
  }

  if (registerBtn) {
    registerBtn.onclick = async () => {
      console.log("REGISTER CLICK");

      const emailInput = document.getElementById("regEmail");
      const usernameInput = document.getElementById("regUsername");
      const passwordInput = document.getElementById("regPassword");

      let ok = true;

      if (!isValidEmail(emailInput.value)) {
        showError(emailInput, "Invalid email format");
        ok = false;
      } else {
        showSuccess(emailInput);
      }

      if (!isValidUsername(usernameInput.value)) {
        showError(usernameInput, "Username must be at least 3 characters");
        ok = false;
      } else {
        showSuccess(usernameInput);
      }

      if (!isValidPassword(passwordInput.value)) {
        showError(passwordInput, "Password must be at least 8 characters");
        ok = false;
      } else {
        showSuccess(passwordInput);
      }

      if (!ok) return;

      try {
        const res = await fetch("/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: emailInput.value,
            username: usernameInput.value,
            password: passwordInput.value
          })
        });

        const data = await res.json();

        if (res.ok) {
          statusEl.textContent = "Account created. Please login.";
          loginTab.click();
        } else {
          statusEl.textContent = data.error || "Registration failed";
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Server error";
      }
    };
  }
});