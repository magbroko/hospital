/**
 * MediCare – Auth Page JavaScript
 * Login / Register tabs, role selection, password toggle, form validation
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'medicare_user';
  const ROLE_STORAGE_KEY = 'medicare_userRole';
  // Use root-relative paths so redirects work from both "/" and "/admin-portal/".
  const PATIENT_DASHBOARD = 'emr-patient-dashboard.html';
  const ADMIN_DASHBOARD = 'admin-dashboard.html';
  const STAFF_DASHBOARD = 'admin-dashboard.html'; // staff land on Staff Dashboard shell
  const PHARMACY_DASHBOARD = 'pharmacy-dashboard.html';
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MIN_PASSWORD_LENGTH = 6;

  // ---------- Tab Switching ----------
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form') || document.getElementById('loginForm');
  const registerForm = document.getElementById('register-form') || document.getElementById('registerForm');

  function switchToTab(tabName) {
    if (!tabs.length || !loginForm || !registerForm) return;

    tabs.forEach((t) => {
      const isActive = t.dataset.tab === tabName;
      t.classList.toggle('auth-tab--active', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (tabName === 'login') {
      loginForm.classList.add('auth-form--active');
      loginForm.removeAttribute('hidden');
      registerForm.classList.remove('auth-form--active');
      registerForm.setAttribute('hidden', '');
      const footerText = document.getElementById('authFooterText');
      const switchLink = document.getElementById('authSwitchLink');
      if (footerText) footerText.textContent = "Don't have an account?";
      if (switchLink) { switchLink.textContent = 'Register'; switchLink.dataset.switchTo = 'register'; }
    } else {
      registerForm.classList.add('auth-form--active');
      registerForm.removeAttribute('hidden');
      loginForm.classList.remove('auth-form--active');
      loginForm.setAttribute('hidden', '');
      const footerText = document.getElementById('authFooterText');
      const switchLink = document.getElementById('authSwitchLink');
      if (footerText) footerText.textContent = 'Already have an account?';
      if (switchLink) { switchLink.textContent = 'Login'; switchLink.dataset.switchTo = 'login'; }
    }
    clearAllErrors();
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchToTab(tab.dataset.tab));
  });

  document.getElementById('authSwitchLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    const to = document.getElementById('authSwitchLink')?.dataset.switchTo;
    if (to) switchToTab(to);
  });

  // ---------- Password Toggle (Font Awesome) ----------
  function initPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!toggle || !input) return;

    toggle.addEventListener('click', () => {
      const icon = toggle.querySelector('i');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.className = input.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
  }

  initPasswordToggle('loginPasswordToggle', 'loginPassword');
  initPasswordToggle('registerPasswordToggle', 'registerPassword');
  initPasswordToggle('registerConfirmToggle', 'registerConfirm');

  // ---------- Password Strength Meter ----------
  const passwordInput = document.getElementById('registerPassword');
  const strengthBar = document.getElementById('passwordStrengthBar');
  if (passwordInput && strengthBar) {
    passwordInput.addEventListener('input', () => {
      const pwd = passwordInput.value;
      let strength = 'none';
      if (pwd.length >= 6) {
        const hasLower = /[a-z]/.test(pwd);
        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
        const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        strength = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
      }
      strengthBar.setAttribute('data-strength', strength);
    });
  }

  // ---------- Validation ----------
  function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = message;
  }

  function clearError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = '';
  }

  function setInputError(input, hasError) {
    if (input) input.classList.toggle('auth-input--error', hasError);
  }

  function clearAllErrors() {
    document.querySelectorAll('.auth-error').forEach((el) => (el.textContent = ''));
    document.querySelectorAll('.auth-input').forEach((el) => el.classList.remove('auth-input--error'));
  }

  function validateEmail(email) {
    return EMAIL_REGEX.test((email || '').trim());
  }

  function validatePassword(password) {
    return password && password.length >= MIN_PASSWORD_LENGTH;
  }

  function saveUserSession(role) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ role }));
      if (role) localStorage.setItem(ROLE_STORAGE_KEY, role);
    } catch (e) {
      console.warn('Storage unavailable');
    }
  }

  function getRedirectUrl(role) {
    if (role === 'patient') return PATIENT_DASHBOARD;
    if (role === 'admin') return ADMIN_DASHBOARD;
    if (role === 'pharmacist') return PHARMACY_DASHBOARD;
    return STAFF_DASHBOARD;
  }

  // ---------- Login Form ----------
  const loginFormEl = document.getElementById('loginForm');
  if (loginFormEl) {
    loginFormEl.addEventListener('submit', (e) => {
      e.preventDefault();

      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');

      clearError('loginEmailError');
      clearError('loginPasswordError');
      setInputError(emailInput, false);
      setInputError(passwordInput, false);

      let isValid = true;

      if (!validateEmail(emailInput.value)) {
        showError('loginEmailError', 'Please enter a valid email address.');
        setInputError(emailInput, true);
        isValid = false;
      }

      if (!validatePassword(passwordInput.value)) {
        showError('loginPasswordError', 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.');
        setInputError(passwordInput, true);
        isValid = false;
      }

      if (isValid) {
        const role = document.querySelector('input[name="role"]:checked')?.value || 'patient';
        saveUserSession(role);
        window.location.href = getRedirectUrl(role);
      }
    });
  }

  // ---------- Register Form ----------
  const registerFormEl = document.getElementById('registerForm');
  if (registerFormEl) {
    registerFormEl.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('registerName');
      const emailInput = document.getElementById('registerEmail');
      const passwordInput = document.getElementById('registerPassword');
      const confirmInput = document.getElementById('registerConfirm');

      clearError('registerNameError');
      clearError('registerEmailError');
      clearError('registerPasswordError');
      clearError('registerConfirmError');
      setInputError(nameInput, false);
      setInputError(emailInput, false);
      setInputError(passwordInput, false);
      setInputError(confirmInput, false);

      let isValid = true;

      if (!nameInput.value.trim()) {
        showError('registerNameError', 'Please enter your full name.');
        setInputError(nameInput, true);
        isValid = false;
      }

      if (!validateEmail(emailInput.value)) {
        showError('registerEmailError', 'Please enter a valid email address.');
        setInputError(emailInput, true);
        isValid = false;
      }

      if (!validatePassword(passwordInput.value)) {
        showError('registerPasswordError', 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.');
        setInputError(passwordInput, true);
        isValid = false;
      }

      if (passwordInput.value !== confirmInput.value) {
        showError('registerConfirmError', 'Passwords do not match.');
        setInputError(confirmInput, true);
        isValid = false;
      }

      if (isValid) {
        const role = document.querySelector('input[name="roleRegister"]:checked')?.value || 'patient';
        saveUserSession(role);
        window.location.href = getRedirectUrl(role);
      }
    });
  }

  // ---------- Blur validation ----------
  function addBlurValidation(inputId, errorId, validator, errorMsg) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('blur', () => {
      if (input.value.trim() === '') {
        clearError(errorId);
        setInputError(input, false);
        return;
      }
      if (!validator(input.value)) {
        showError(errorId, errorMsg);
        setInputError(input, true);
      } else {
        clearError(errorId);
        setInputError(input, false);
      }
    });
  }

  addBlurValidation('loginEmail', 'loginEmailError', validateEmail, 'Please enter a valid email address.');
  addBlurValidation('loginPassword', 'loginPasswordError', validatePassword, 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.');
  addBlurValidation('registerEmail', 'registerEmailError', validateEmail, 'Please enter a valid email address.');
  addBlurValidation('registerPassword', 'registerPasswordError', validatePassword, 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.');
})();
