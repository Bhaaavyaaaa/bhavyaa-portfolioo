/* ==========================================================================
   BHAVYA ARORA — Contact form
   There is no form backend, so the message is handed to the visitor's own
   email app via mailto:, pre-filled. Nothing here pretends a message was
   sent: the status line only says the email app was opened.
   Without JavaScript the form still falls back to its mailto: action.
   ========================================================================== */

(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const TO = 'bhavyaarora0808@gmail.com';
  const status = document.getElementById('cf-status');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Native validation messages, surfaced on the first invalid field
    const invalid = [...form.elements].find((el) => el.willValidate && !el.checkValidity());
    form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (invalid) {
      invalid.setAttribute('aria-invalid', 'true');
      invalid.reportValidity();
      invalid.focus();
      return;
    }

    const v = (name) => form.elements[name].value.trim();
    const body = `${v('message')}\n\n— ${v('name')}\n${v('email')}`;
    const url = `mailto:${TO}?subject=${encodeURIComponent(v('subject'))}&body=${encodeURIComponent(body)}`;
    window.location.href = url;

    status.innerHTML = `Your email app should now be open with the message ready — just press send there. Nothing opened? Email <a href="mailto:${TO}">${TO}</a> directly.`;
  });
})();
