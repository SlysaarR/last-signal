// dialogs responsibilities for Last Signal.
import { $ } from './dom.js?v=0.15.0';
export let modalAction = null;
export function modal(label, icon, title, text, button, action) {
  $('modalLabel').style.color = '#a9bd84';
  $('modalLabel').textContent = label;
  $('modalIcon').textContent = icon;
  $('modalTitle').textContent = title;
  $('modalText').textContent = text;
  $('modalClose').textContent = button;
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
