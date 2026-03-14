/**
 * MediCare – Auth Page JavaScript
 * Role-based login (Patient: First Name + Phone | Staff: Staff ID + Password)
 * Tab switching, password toggle, validation, haptic shake on failure
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'medicare_user';
  const ROLE_STORAGE_KEY = 'medicare_userRole';
  const PATIENT_DASHBOARD = 'emr-patient-dashboard.html';
  const ADMIN_DASHBOARD = 'admin-dashboard.html';
  const PHARMACY_DASHBOARD = 'pharmacy-dashboard.html';
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PHONE_REGEX = /^[\d\s\-\(\)]{10,}$/;
  const MIN_PASSWORD_LENGTH = 6;

  // Demo credentials (Staff)
  const DEMO_CREDENTIALS = {
    admin: { staffId: 'STF-ADM-001', password: 'admin123' },
    pharmacist: { staffId: 'STF-PHM-001', password: 'pharmacy123' }
  };

  // ---------- Role-based field toggling ----------
  const patientFields = document.getElementById('patientFields');
  const staffFields = document.getElementById('staffFields');
  const roleInputs = document.querySelectorAll('input[name="role"]');

  function updateLoginFieldsByRole() {
    const role = document.querySelector('input[name="role"]:checked')?.value || 'patient';
    const isPatient = role === 'patient';
    if (patientFields) patientFields.classList.toggle('hidden', !isPatient);
    if (staffFields) staffFields.classList.toggle('hidden', isPatient);
  }

  roleInputs.forEach((r) => r.addEventListener('change', updateLoginFieldsByRole));
  updateLoginFieldsByRole();

  // ---------- Tab Switching ----------
  const tabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');

  function switchToTab(tabName) {
    if (!tabs.length || !loginForm || !registerForm) return;

    tabs.forEach((t) => {
      const isActive = t.dataset.tab === tabName;
      t.classList.toggle('bg-teal-600', isActive);
      t.classList.toggle('text-white', isActive);
      t.classList.toggle('text-slate-500', !isActive);
      t.classList.toggle('shadow-sm', isActive);
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (tabName === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      const footerText = document.getElementById('authFooterText');
      const switchLink = document.getElementById('authSwitchLink');
      if (footerText) footerText.textContent = "Don't have an account?";
      if (switchLink) { switchLink.textContent = 'Register'; switchLink.dataset.switchTo = 'register'; }
    } else {
      registerForm.classList.remove('hidden');
      loginForm.classList.add('hidden');
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

  // ---------- Password Toggle ----------
  function initPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (!toggle || !input) return;

    toggle.addEventListener('click', () => {
      const icon = toggle.querySelector('i');
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      icon.className = input.type === 'password' ? 'fas fa-eye text-sm' : 'fas fa-eye-slash text-sm';
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
      let width = '0%';
      let bg = 'bg-slate-200';
      if (pwd.length >= 6) {
        const hasLower = /[a-z]/.test(pwd);
        const hasUpper = /[A-Z]/.test(pwd);
        const hasNumber = /\d/.test(pwd);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
        const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
        strength = score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong';
        width = strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%';
        bg = strength === 'weak' ? 'bg-rose-500' : strength === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
      }
      strengthBar.setAttribute('data-strength', strength);
      strengthBar.style.width = width;
      strengthBar.className = 'h-full rounded-full transition-all duration-300 ' + bg;
    });
  }

  // ---------- Validation helpers ----------
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
    document.querySelectorAll('[id$="Error"]').forEach((el) => { if (el) el.textContent = ''; });
    document.querySelectorAll('.auth-input-elite').forEach((el) => el.classList.remove('auth-input--error'));
  }

  function validatePhone(phone) {
    return PHONE_REGEX.test((phone || '').replace(/\s/g, ''));
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
    return ADMIN_DASHBOARD;
  }

  // ---------- Haptic Shake ----------
  function triggerHapticShake(element) {
    const el = element || document.getElementById('loginForm');
    if (!el) return;
    el.classList.remove('animate-haptic-shake');
    void el.offsetWidth;
    el.classList.add('animate-haptic-shake');
    setTimeout(() => el.classList.remove('animate-haptic-shake'), 500);
  }

  // ---------- Login Form ----------
  const loginFormEl = document.getElementById('loginForm');
  if (loginFormEl) {
    loginFormEl.addEventListener('submit', (e) => {
      e.preventDefault();

      const role = document.querySelector('input[name="role"]:checked')?.value || 'patient';
      const isPatient = role === 'patient';

      // Clear errors
      clearError('loginFirstNameError');
      clearError('loginPhoneError');
      clearError('loginStaffIdError');
      clearError('loginPasswordError');
      setInputError(document.getElementById('loginFirstName'), false);
      setInputError(document.getElementById('loginPhone'), false);
      setInputError(document.getElementById('loginStaffId'), false);
      setInputError(document.getElementById('loginPassword'), false);

      let isValid = true;

      if (isPatient) {
        const firstName = document.getElementById('loginFirstName')?.value?.trim();
        const phone = document.getElementById('loginPhone')?.value?.trim();

        if (!firstName) {
          showError('loginFirstNameError', 'Please enter your first name.');
          setInputError(document.getElementById('loginFirstName'), true);
          isValid = false;
        }
        if (!validatePhone(phone)) {
          showError('loginPhoneError', 'Please enter a valid phone number (at least 10 digits).');
          setInputError(document.getElementById('loginPhone'), true);
          isValid = false;
        }

        if (isValid) {
          saveUserSession('patient');
          window.location.href = getRedirectUrl('patient');
        }
      } else {
        const staffId = document.getElementById('loginStaffId')?.value?.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!staffId) {
          showError('loginStaffIdError', 'Please enter your Staff ID.');
          setInputError(document.getElementById('loginStaffId'), true);
          isValid = false;
        }
        if (!validatePassword(password)) {
          showError('loginPasswordError', 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.');
          setInputError(document.getElementById('loginPassword'), true);
          isValid = false;
        }

        if (isValid) {
          const creds = DEMO_CREDENTIALS[role];
          if (creds && staffId === creds.staffId && password === creds.password) {
            saveUserSession(role);
            window.location.href = getRedirectUrl(role);
          } else {
            triggerHapticShake(loginFormEl);
            showError('loginPasswordError', 'Invalid Staff ID or password. Try Admin: STF-ADM-001 / admin123 or Pharmacist: STF-PHM-001 / pharmacy123');
            setInputError(document.getElementById('loginStaffId'), true);
            setInputError(document.getElementById('loginPassword'), true);
          }
        }
      }

      if (!isValid) {
        triggerHapticShake(loginFormEl);
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

      if (!EMAIL_REGEX.test(emailInput.value)) {
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
      } else {
        triggerHapticShake(registerFormEl);
      }
    });
  }
})();
