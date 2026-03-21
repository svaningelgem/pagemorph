let rules = [];
let dirty = false;

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await browser.storage.local.get({ rules: [] });
  rules = stored.rules;
  render();

  document.getElementById("btn-add-group").addEventListener("click", () => {
    rules.push({
      urlPattern: "",
      urlIsRegex: true,
      replacements: [
        { search: "", replace: "", searchIsRegex: false, regexFlags: "gi", htmlMode: false, enabled: true },
      ],
    });
    markDirty();
    render();
  });

  document.getElementById("btn-save").addEventListener("click", saveWithValidation);
  document.getElementById("btn-export").addEventListener("click", exportRules);
  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("file-import").click();
  });
  document.getElementById("file-import").addEventListener("change", importRules);
});

function markDirty() {
  dirty = true;
  const btn = document.getElementById("btn-save");
  btn.textContent = "Save";
  btn.classList.remove("btn-saved");
}

function validate() {
  const errors = [];

  // Clear previous error highlights
  document.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));

  rules.forEach((group, gi) => {
    // Validate URL pattern if regex
    if (group.urlIsRegex && group.urlPattern) {
      try {
        new RegExp(group.urlPattern);
      } catch (e) {
        errors.push({ gi, field: "urlPattern", msg: `URL pattern: ${e.message}` });
      }
    }

    (group.replacements || []).forEach((rep, ri) => {
      // Validate search regex
      if (rep.searchIsRegex && rep.search) {
        try {
          new RegExp(rep.search, rep.regexFlags || "gi");
        } catch (e) {
          errors.push({ gi, ri, field: "search", msg: `Search regex: ${e.message}` });
        }
      }

      // Validate flags
      if (rep.regexFlags) {
        try {
          new RegExp("", rep.regexFlags);
        } catch (e) {
          errors.push({ gi, ri, field: "regexFlags", msg: `Flags: ${e.message}` });
        }
      }
    });
  });

  // Highlight error fields
  for (const err of errors) {
    let selector;
    if (err.ri !== undefined) {
      selector = `[data-gi="${err.gi}"][data-ri="${err.ri}"][data-field="${err.field}"]`;
    } else {
      selector = `[data-gi="${err.gi}"][data-field="${err.field}"]`;
    }
    const el = document.querySelector(selector);
    if (el) el.classList.add("input-error");
  }

  return errors;
}

function saveWithValidation() {
  const errors = validate();
  if (errors.length > 0) {
    showToast("Invalid regex — check highlighted fields.");
    return;
  }

  browser.storage.local.set({ rules });
  dirty = false;

  const btn = document.getElementById("btn-save");
  btn.textContent = "Everything saved";
  btn.classList.add("btn-saved");
  showToast("Rules saved.");

  setTimeout(() => {
    if (!dirty) {
      btn.textContent = "Saved";
    }
  }, 2500);
}

function render() {
  const container = document.getElementById("rule-groups");
  container.innerHTML = "";

  rules.forEach((group, gi) => {
    const groupEl = document.createElement("div");
    groupEl.className = "rule-group";

    // Header: URL pattern + options
    const header = document.createElement("div");
    header.className = "rule-group-header";
    header.innerHTML = `
      <input type="text" value="${escapeAttr(group.urlPattern)}"
             placeholder="URL pattern (e.g. example\\.com)"
             data-gi="${gi}" data-field="urlPattern">
      <label><input type="checkbox" ${group.urlIsRegex ? "checked" : ""}
             data-gi="${gi}" data-field="urlIsRegex"> Regex</label>
      <button class="btn btn-danger btn-small" data-action="delete-group" data-gi="${gi}">Delete</button>
    `;
    groupEl.appendChild(header);

    // Replacements
    const repsEl = document.createElement("div");
    repsEl.className = "replacements";

    (group.replacements || []).forEach((rep, ri) => {
      const row = document.createElement("div");
      row.className = "replacement-row";
      row.innerHTML = `
        <input type="checkbox" class="enabled-toggle" ${rep.enabled !== false ? "checked" : ""}
               data-gi="${gi}" data-ri="${ri}" data-field="enabled"
               title="Enable/disable this rule">
        <input type="text" value="${escapeAttr(rep.search)}"
               placeholder="Search..." data-gi="${gi}" data-ri="${ri}" data-field="search">
        <span class="arrow">&rarr;</span>
        <input type="text" value="${escapeAttr(rep.replace)}"
               placeholder="Replace with..." data-gi="${gi}" data-ri="${ri}" data-field="replace">
        <label><input type="checkbox" ${rep.searchIsRegex ? "checked" : ""}
               data-gi="${gi}" data-ri="${ri}" data-field="searchIsRegex"> Regex</label>
        <input type="text" class="flags-input" value="${escapeAttr(rep.regexFlags || "gi")}"
               placeholder="gi" data-gi="${gi}" data-ri="${ri}" data-field="regexFlags"
               title="Regex flags (e.g. g, gi)">
        <label class="html-toggle"><input type="checkbox" ${rep.htmlMode ? "checked" : ""}
               data-gi="${gi}" data-ri="${ri}" data-field="htmlMode"> HTML</label>
        <button class="btn btn-danger btn-small" data-action="delete-rep"
                data-gi="${gi}" data-ri="${ri}">x</button>
      `;
      repsEl.appendChild(row);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "btn btn-small btn-add-replacement";
    addBtn.textContent = "+ Add Replacement";
    addBtn.dataset.action = "add-rep";
    addBtn.dataset.gi = gi;
    repsEl.appendChild(addBtn);

    groupEl.appendChild(repsEl);
    container.appendChild(groupEl);
  });

  // Attach event listeners
  container.addEventListener("input", handleInput);
  container.addEventListener("change", handleChange);
  container.addEventListener("click", handleClick);
}

function handleInput(e) {
  const { gi, ri, field } = e.target.dataset;
  if (gi === undefined || field === undefined) return;

  if (ri !== undefined) {
    rules[gi].replacements[ri][field] = e.target.value;
  } else {
    rules[gi][field] = e.target.value;
  }
  markDirty();
}

function handleChange(e) {
  const { gi, ri, field } = e.target.dataset;
  if (gi === undefined || field === undefined) return;
  if (e.target.type !== "checkbox") return;

  if (ri !== undefined) {
    rules[gi].replacements[ri][field] = e.target.checked;
  } else {
    rules[gi][field] = e.target.checked;
  }
  markDirty();
}

function handleClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const gi = parseInt(btn.dataset.gi, 10);

  if (action === "delete-group") {
    rules.splice(gi, 1);
    markDirty();
    render();
  } else if (action === "delete-rep") {
    const ri = parseInt(btn.dataset.ri, 10);
    rules[gi].replacements.splice(ri, 1);
    markDirty();
    render();
  } else if (action === "add-rep") {
    rules[gi].replacements.push({
      search: "",
      replace: "",
      searchIsRegex: false,
      regexFlags: "gi",
      htmlMode: false,
      enabled: true,
    });
    markDirty();
    render();
  }
}

function exportRules() {
  const blob = new Blob([JSON.stringify(rules, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pagemorph-rules.json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Rules exported.");
}

function importRules(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error("Invalid format");
      rules = imported;
      await saveWithValidation();
      render();
    } catch {
      showToast("Import failed: invalid JSON.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function escapeAttr(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
