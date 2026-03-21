document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const rulesEl = document.getElementById("current-rules");

  // Get the active tab URL
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tabs[0]?.url || "";

  const { rules } = await browser.storage.local.get({ rules: [] });

  // Find matching groups
  const matching = rules.filter((group) => {
    try {
      if (group.urlIsRegex) {
        return new RegExp(group.urlPattern).test(currentUrl);
      }
      return currentUrl.includes(group.urlPattern);
    } catch {
      return false;
    }
  });

  if (matching.length === 0) {
    statusEl.textContent = "No rules match this page.";
  } else {
    const totalReplacements = matching.reduce(
      (sum, g) => sum + (g.replacements || []).filter((r) => r.enabled !== false).length,
      0
    );
    statusEl.textContent = `${totalReplacements} active replacement(s) for this page.`;

    for (const group of matching) {
      const div = document.createElement("div");
      div.className = "rule-summary";
      const activeCount = (group.replacements || []).filter((r) => r.enabled !== false).length;
      div.innerHTML = `
        <div class="url-pattern">${escapeHtml(group.urlPattern)}</div>
        <div class="count">${activeCount} replacement(s)</div>
      `;
      rulesEl.appendChild(div);
    }
  }

  document.getElementById("btn-options").addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });

  document.getElementById("btn-reload").addEventListener("click", async () => {
    await browser.tabs.reload(tabs[0].id);
    window.close();
  });
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
