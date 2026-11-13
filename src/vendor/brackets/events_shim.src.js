// Minimal EventEmitter stand-in for the browser bundle (brackets-manager only needs on/emit/listenerCount). Own code.
export class EventEmitter {
  constructor() { this._e = {}; }
  on(n, f) { (this._e[n] ||= []).push(f); return this; }
  off(n, f) { this._e[n] = (this._e[n] || []).filter((g) => g !== f); return this; }
  emit(n, ...a) { const l = this._e[n] || []; l.forEach((f) => f(...a)); return l.length > 0; }
  listenerCount(n) { return (this._e[n] || []).length; }
}
export default { EventEmitter };
