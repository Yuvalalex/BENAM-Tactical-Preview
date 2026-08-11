function hasOwn(name) {
  return Object.prototype.hasOwnProperty.call(window, name);
}

export function readLegacyGlobal(name) {
  if (hasOwn(name)) {
    return window[name];
  }
  return undefined;
}

export function writeLegacyGlobal(name, value) {
  window[name] = value;
  return value;
}

export function callLegacyFunction(name, ...args) {
  const fn = readLegacyGlobal(name);
  if (typeof fn === 'function') {
    return fn(...args);
  }
  return undefined;
}
