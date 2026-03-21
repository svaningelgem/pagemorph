let rules = [];

document.addEventListener("DOMContentLoaded", async () => {
  const stored = await browser.storage.local.get({ rules: [] });
  rules = stored.rules;
  render();

  document.getElementById("btn-add-group").addEventListener("click", () => {
    rules.push({
      urlPattern: "",
      urlIsRegex: true,
      replacements: [
        { search: "", replace: "", searchIsRegex: false, regexFlags: "g", enabled: true },
      ],
    });
    save();
    render();
  });

  document.getElementById("btn-export").addEventListener("click", exportRules);
  document.getElementById("btn-import").addEventListener("click", () => {
    document.getElementById("file-import").click();
  });
  document.getElementById("file-import").addEventListener("change", importRules);
});

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
        <input type="text" class="flags-input" value="${escapeAttr(rep.regexFlags || "g")}"
               placeholder="g" data-gi="${gi}" data-ri="${ri}" data-field="regexFlags"
               title="Regex flags (e.g. g, gi)">
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
  save();
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
  save();
}

function handleClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const gi = parseInt(btn.dataset.gi, 10);

  if (action === "delete-group") {
    rules.splice(gi, 1);
    save();
    render();
  } else if (action === "delete-rep") {
    const ri = parseInt(btn.dataset.ri, 10);
    rules[gi].replacements.splice(ri, 1);
    save();
    render();
  } else if (action === "add-rep") {
    rules[gi].replacements.push({
      search: "",
      replace: "",
      searchIsRegex: false,
      regexFlags: "g",
      enabled: true,
    });
    save();
    render();
  }
}

function save() {
  browser.storage.local.set({ rules });
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
      await save();
      render();
      showToast("Rules imported.");
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
