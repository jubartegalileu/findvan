/* eslint-env browser */

export function createButton({ label = 'Botao', primary = false, disabled = false }) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = primary ? 'button button-primary' : 'button';
  btn.textContent = label;
  btn.disabled = disabled;
  return btn;
}
