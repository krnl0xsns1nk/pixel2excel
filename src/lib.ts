 const $ = {
  id: document.getElementById.bind(document),
  qs: document.querySelector.bind(document),
  qsa: document.querySelectorAll.bind(document),
  cls: document.getElementsByClassName.bind(document),
  on: (element: HTMLElement, event: keyof HTMLElementEventMap, handler: EventListener) => element.addEventListener(event, handler),
  off: (element: HTMLElement, event: keyof HTMLElementEventMap, handler: EventListener) => element.removeEventListener(event, handler),
  show: (element: HTMLElement) => element.style.display = '',
  hide: (element: HTMLElement) => element.style.display = 'none',
  toggle: (element: HTMLElement) => element.style.display = element.style.display === 'none' ? '' : 'none',
};
export default $;
