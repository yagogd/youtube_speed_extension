"use strict";

export function getStored(defaults) {
  return new Promise((resolve) => chrome.storage.local.get(defaults, resolve));
}

export function setStored(values, callback) {
  chrome.storage.local.set(values, callback);
}

export function removeStored(keys, callback) {
  chrome.storage.local.remove(keys, callback);
}
