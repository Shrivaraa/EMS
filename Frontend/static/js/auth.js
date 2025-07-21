function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.innerHTML = message;

  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = `toast ${type}`;
  }, 2500);
}
function isTokenExpired(token) {
  if (!token) return true;

  try {
    const payloadBase64 = token.split(".")[1];
    const payloadJson = atob(payloadBase64);
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);

    return payload.exp < now;
  } catch (err) {
    // console.error("Invalid JWT:", err);
    return true;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.removeItem("jwt_token");
      window.location.href = "/pages/Login.html";
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector('form[action="/login"]');
  const signupForm = document.querySelector('form[action="/signup"]');

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = loginForm.username.value.trim();
      const password = loginForm.password.value;

      try {
        const res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        const result = await res.json();
        showToast(result.message, res.ok ? "success" : "error");

        if (res.ok) {
          localStorage.setItem("jwt_token", result.token);
          setTimeout(() => {
            window.location.href = "/pages/dashboard.html";
          }, 2000);
        } else if (result.message === "User Not Found, Please SignUp") {
          setTimeout(() => {
            window.location.href = "/pages/SignUp.html";
          }, 2000);
        }
      } catch (err) {
        showToast("Something went wrong. Please try again.", "error");
        console.error(err);
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = signupForm.username.value.trim();
      const password = signupForm.password.value;
      const email = signupForm.email.value.trim();

      const capital = /[A-Z]/;
      const special = /[!@#$%^&*(),.?":{}|<>]/;
      const number = /[0-9]/;
      const minLength = password.length >= 8;

      const errors = [];

      if (!capital.test(password)) {
        errors.push("• At least one uppercase letter");
      }
      if (!special.test(password)) {
        errors.push("• At least one special character");
      }
      if (!number.test(password)) {
        errors.push("• At least one number");
      }
      if (!minLength) {
        errors.push("• Minimum 8 characters");
      }

      if (errors.length > 0) {
        showToast("Password must include:<br>" + errors.join("<br>"), "error");
        return;
      }

      try {
        const res = await fetch("/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, email }),
        });

        const result = await res.json();
        showToast(result.message, res.ok ? "success" : "error");

        setTimeout(() => {
          window.location.href = "/pages/Login.html";
        }, 2000);
      } catch (err) {
        showToast("Something went wrong. Try again.", "error");
        console.error(err);
      }
    });
  }
});

function togglePassword() {
  const pw = document.getElementById("password");
  // const toggleText = document.getElementById("toggleText");

  const isPasswordHidden = pw.type === "password";
  pw.type = isPasswordHidden ? "text" : "password";
  // toggleText.textContent = isPasswordHidden ? "Hide Password" : "Show Password";
}
