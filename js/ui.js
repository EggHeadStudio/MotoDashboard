export function setCollapsedState(bodyElement, toggleElement, collapsed, className) {
  if (bodyElement && bodyElement.classList && typeof bodyElement.classList.toggle === 'function') {
    bodyElement.classList.toggle(className, !!collapsed);
  }

  if (toggleElement && toggleElement.setAttribute) {
    toggleElement.setAttribute('aria-expanded', String(!collapsed));
  }

  return !!collapsed;
}

export function setTextContent(element, text) {
  if (!element) {
    return;
  }

  element.textContent = text == null ? '' : String(text);
}
