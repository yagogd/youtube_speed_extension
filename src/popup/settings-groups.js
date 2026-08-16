"use strict";

export function createSettingsGroup(title, description) {
  const group = document.createElement("details");
  group.className = "settings-subgroup";

  const heading = document.createElement("summary");
  heading.className = "settings-subgroup__heading";
  const strong = document.createElement("strong");
  strong.textContent = title;
  const copy = document.createElement("span");
  copy.textContent = description;
  heading.append(strong, copy);
  group.appendChild(heading);
  return group;
}
