import { t as localize } from './i18n.js?v=0.55.1';
// dialogs responsibilities for Last Signal.
import { $ } from './dom.js?v=0.55.1';
export let modalAction = null;
export function modal(label, icon, title, text, button, action) {
  $('modalLabel').style.color = '#a9bd84';
  $('modalLabel').textContent = localize(label);
  $('modalIcon').textContent = localize(icon);
  $('modalTitle').textContent = localize(title);
  $('modalText').textContent = localize(text);
  $('modalClose').textContent = localize(button);
  $('modalCancel').hidden = !action;
  modalAction = action || null;
  $('modal').showModal();
}
export function initDialogs() {
  $('modalCancel').onclick = () => {
    modalAction = null;
    $('modal').close();
  };
  $('modalClose').onclick = () => {
    $('modal').close();
    const action = modalAction;
    modalAction = null;
    if (action) action();
  };
  $('modal').addEventListener('cancel', () => modalAction = null);
}

