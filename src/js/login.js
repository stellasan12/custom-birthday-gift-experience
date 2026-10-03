const DEFAULT_PIN = '122500';
const SESSION_KEY = 'birthdayGiftAuthenticated';

function isAuthenticated() {
  try { return sessionStorage.getItem(SESSION_KEY) === 'true'; }
  catch { return false; }
}

function rememberAuthentication() {
  try { sessionStorage.setItem(SESSION_KEY, 'true'); }
  catch { /* Continue when browser storage is unavailable. */ }
}

export function requireBirthdayPin(appEl) {
  if (isAuthenticated()) return Promise.resolve();

  return new Promise((resolve) => {
    const pinFields = Array.from({ length: 6 }, (_, index) => `
      <input class="pin-login__digit" name="pin-${index + 1}" type="text"
        inputmode="numeric" pattern="[0-9]" maxlength="1"
        ${index === 0 ? 'autocomplete="one-time-code"' : 'autocomplete="off"'}
        aria-label="PIN digit ${index + 1} of 6" required>
    `).join('');

    appEl.innerHTML = `
      <main class="pin-login" aria-labelledby="pin-login-title">
        <section class="pin-login__card">
          <div class="pin-login__reminder">
            <img src="/images/birthday-walkthrough-reminder.png" alt="Birthday gift walkthrough reminders">
          </div>
          <div class="pin-login__form-panel">
            <p class="pin-login__eyebrow">A little surprise awaits</p>
            <h1 id="pin-login-title">Welcome, Nay Jhaymiee! &#128140;</h1>
            <p class="pin-login__copy">Enter your secret PIN to unwrap your gift.</p>
            <form class="pin-login__form" id="pin-login-form" novalidate>
              <fieldset class="pin-login__pin-group" aria-describedby="pin-login-hint pin-login-error">
                <legend>PIN number</legend>
                <div class="pin-login__input-row" id="birthday-pin">${pinFields}</div>
              </fieldset>
              <p class="pin-login__hint" id="pin-login-hint">Your six-digit key to the celebration &#10024;</p>
              <p class="pin-login__error" id="pin-login-error" role="alert" aria-live="polite"></p>
              <button class="pin-login__submit" type="submit">Open my gift &#127873;</button>
            </form>
          </div>
        </section>
      </main>`;

    const form = document.getElementById('pin-login-form');
    const inputs = [...document.querySelectorAll('.pin-login__digit')];
    const error = document.getElementById('pin-login-error');

    const clearError = () => {
      inputs.forEach((input) => input.removeAttribute('aria-invalid'));
      error.textContent = '';
    };

    inputs[0]?.focus();
    inputs.forEach((input, index) => {
      input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(-1);
        clearError();
        if (input.value) inputs[index + 1]?.focus();
      });

      input.addEventListener('keydown', (event) => {
        if (event.key === 'Backspace' && !input.value && index > 0) inputs[index - 1].focus();
        if (event.key === 'ArrowLeft') inputs[index - 1]?.focus();
        if (event.key === 'ArrowRight') inputs[index + 1]?.focus();
      });

      input.addEventListener('paste', (event) => {
        const digits = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!digits) return;
        event.preventDefault();
        digits.split('').forEach((digit, digitIndex) => {
          if (inputs[digitIndex]) inputs[digitIndex].value = digit;
        });
        clearError();
        inputs[Math.min(digits.length, 6) - 1]?.focus();
      });
    });

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const enteredPin = inputs.map((input) => input.value).join('');
      if (enteredPin !== DEFAULT_PIN) {
        inputs.forEach((input) => {
          input.value = '';
          input.setAttribute('aria-invalid', 'true');
        });
        error.textContent = 'That PIN does not match. Please try again.';
        inputs[0]?.focus();
        return;
      }
      rememberAuthentication();
      appEl.querySelector('.pin-login__card')?.classList.add('pin-login__card--success');
      window.setTimeout(resolve, 420);
    });
  });
}
