(function () {
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var CODE_RE = /^\d{6}$/;
  var MIN_PASSWORD = 8;
  var CODE_COOLDOWN = 60;

  var MSG = {
    emailInvalid: "Please enter a valid email address",
    passwordMin: "Password must be at least 8 characters",
    confirmMismatch: "Passwords do not match",
    codeInvalid: "Please enter a valid 6-digit verification code",
  };

  document.querySelectorAll("[data-toggle-pwd]").forEach(function (btn) {
    var targetId = btn.getAttribute("aria-controls");
    var input = targetId ? document.getElementById(targetId) : null;
    if (!input) return;

    btn.addEventListener("click", function () {
      var isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
      btn.setAttribute("aria-pressed", isHidden ? "true" : "false");
    });
  });

  function getErrorEl(field) {
    var el = field.querySelector(".auth-error");
    if (!el) {
      el = document.createElement("p");
      el.className = "auth-error";
      el.setAttribute("role", "alert");
      field.appendChild(el);
    }
    return el;
  }

  function setFieldError(field, input, message) {
    var hasError = Boolean(message);
    field.classList.toggle("auth-field--error", hasError);
    input.setAttribute("aria-invalid", hasError ? "true" : "false");
    var err = getErrorEl(field);
    err.textContent = message || "";
    err.hidden = !hasError;
  }

  function clearFieldError(input) {
    var field = getFieldWrap(input);
    if (field) setFieldError(field, input, "");
  }

  function validateEmailWrong(value) {
    var v = (value || "").trim();
    if (!v || EMAIL_RE.test(v)) return "";
    return MSG.emailInvalid;
  }

  function validatePasswordWrong(value) {
    if (!value || value.length >= MIN_PASSWORD) return "";
    return MSG.passwordMin;
  }

  function validateConfirmWrong(password, confirm) {
    if (!confirm || confirm === password) return "";
    return MSG.confirmMismatch;
  }

  function validateCodeWrong(value) {
    if (!value || CODE_RE.test(value)) return "";
    return MSG.codeInvalid;
  }

  function isEmailValid(value) {
    return EMAIL_RE.test((value || "").trim());
  }

  function getFieldWrap(input) {
    return input.closest(".auth-field");
  }

  function bindField(input, validateFn) {
    var field = getFieldWrap(input);
    if (!field) return;

    function run() {
      setFieldError(field, input, validateFn(input.value));
    }

    input.addEventListener("blur", function () {
      if (!(input.value || "").trim() && !field.classList.contains("auth-field--error")) return;
      run();
    });

    input.addEventListener("input", function () {
      if (field.classList.contains("auth-field--error")) run();
      else if (!(input.value || "").trim()) clearFieldError(input);
    });
  }

  function startCodeCooldown(btn) {
    var remaining = CODE_COOLDOWN;
    btn.disabled = true;
    btn.textContent = remaining + "s";

    var timer = window.setInterval(function () {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(timer);
        btn.disabled = false;
        btn.textContent = "Send code";
        return;
      }
      btn.textContent = remaining + "s";
    }, 1000);
  }

  document.querySelectorAll("[data-auth-form]").forEach(function (form) {
    var nameInput = form.querySelector('input[name="name"]');
    var emailInput = form.querySelector('input[name="email"]');
    var codeInput = form.querySelector('input[name="verification_code"]');
    var passwordInput = form.querySelector('input[name="password"]');
    var confirmInput = form.querySelector('input[name="confirm_password"]');
    var sendCodeBtn = form.querySelector("[data-send-code]");

    if (emailInput) {
      bindField(emailInput, validateEmailWrong);
    }
    if (codeInput) {
      bindField(codeInput, validateCodeWrong);
      codeInput.addEventListener("input", function () {
        codeInput.value = codeInput.value.replace(/\D/g, "").slice(0, 6);
      });
    }
    if (passwordInput) {
      bindField(passwordInput, validatePasswordWrong);
    }
    if (confirmInput) {
      bindField(confirmInput, function (value) {
        return validateConfirmWrong(passwordInput ? passwordInput.value : "", value);
      });
    }

    if (sendCodeBtn && emailInput) {
      sendCodeBtn.addEventListener("click", function () {
        var emailErr = validateEmailWrong(emailInput.value);
        var emailField = getFieldWrap(emailInput);

        if (!(emailInput.value || "").trim()) {
          emailInput.focus();
          return;
        }

        if (emailErr) {
          setFieldError(emailField, emailInput, emailErr);
          emailInput.focus();
          return;
        }

        if (!isEmailValid(emailInput.value)) return;

        startCodeCooldown(sendCodeBtn);
      });
    }

    form.addEventListener("submit", function (e) {
      var valid = true;
      var firstInvalid = null;

      function check(input, err) {
        if (!input) return;
        var field = getFieldWrap(input);
        setFieldError(field, input, err);
        if (err) {
          valid = false;
          firstInvalid = firstInvalid || input;
        }
      }

      function requireValue(input) {
        if (!input) return;
        if (!(input.value || "").trim()) {
          valid = false;
          firstInvalid = firstInvalid || input;
        }
      }

      if (nameInput) {
        requireValue(nameInput);
      }

      if (emailInput) {
        var emailErr = validateEmailWrong(emailInput.value);
        check(emailInput, emailErr);
        if (!emailErr) requireValue(emailInput);
      }

      if (codeInput) {
        var codeErr = validateCodeWrong(codeInput.value);
        check(codeInput, codeErr);
        if (!codeErr) requireValue(codeInput);
      }

      if (passwordInput) {
        var pwdErr = validatePasswordWrong(passwordInput.value);
        check(passwordInput, pwdErr);
        if (!pwdErr) requireValue(passwordInput);
      }

      if (confirmInput) {
        var confirmErr = validateConfirmWrong(
          passwordInput ? passwordInput.value : "",
          confirmInput.value
        );
        check(confirmInput, confirmErr);
        if (!confirmErr) requireValue(confirmInput);
      }

      if (!valid) {
        e.preventDefault();
        if (firstInvalid) firstInvalid.focus();
      }
    });
  });
})();
