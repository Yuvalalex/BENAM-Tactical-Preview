export function getElement(id) {
  return document.getElementById(id);
}

export function padTwoDigits(value) {
  return String(value).padStart(2, '0');
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let trustedTypesPolicy = null;

function getTrustedPolicy() {
  if (trustedTypesPolicy || typeof window === 'undefined' || !window.trustedTypes) {
    return trustedTypesPolicy;
  }

  trustedTypesPolicy = window.trustedTypes.createPolicy('benam-static-html', {
    createHTML: (value) => value,
  });
  return trustedTypesPolicy;
}

export function setStaticHtml(element, html) {
  if (!element) return;
  const policy = getTrustedPolicy();
  if (policy) {
    element.innerHTML = policy.createHTML(String(html));
    return;
  }
  element.innerHTML = String(html);
}