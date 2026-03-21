/**
 * Content script: runs on every page, checks URL against stored rules,
 * and performs text replacements in the DOM.
 *
 * Two modes per rule:
 * - Text mode (default): walks text nodes, safe and surgical
 * - HTML mode: operates on innerHTML, can modify tags/attributes/structure
 */

(async function () {
  const { rules } = await browser.storage.local.get({ rules: [] });

  const currentUrl = window.location.href;

  // Find all rule groups whose URL pattern matches the current page
  const matchingGroups = rules.filter((group) => {
    try {
      if (group.urlIsRegex) {
        return new RegExp(group.urlPattern).test(currentUrl);
      }
      return currentUrl.includes(group.urlPattern);
    } catch {
      return false;
    }
  });

  if (matchingGroups.length === 0) return;

  const allReplacements = matchingGroups.flatMap((group) =>
    (group.replacements || []).filter((r) => r.enabled !== false)
  );

  if (allReplacements.length === 0) return;

  const textRules = allReplacements.filter((r) => !r.htmlMode);
  const htmlRules = allReplacements.filter((r) => r.htmlMode);

  // --- Initial pass ---
  if (htmlRules.length > 0) {
    applyHtmlRules(document.body, htmlRules);
  }
  if (textRules.length > 0) {
    applyTextRulesToTree(document.body, textRules);
  }

  // --- Observe future DOM changes ---
  let paused = false;

  const observer = new MutationObserver((mutations) => {
    if (paused) return;

    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType === Node.TEXT_NODE) {
          if (textRules.length > 0) {
            applyTextRulesToNode(addedNode, textRules);
          }
        } else if (addedNode.nodeType === Node.ELEMENT_NODE) {
          if (htmlRules.length > 0) {
            paused = true;
            applyHtmlRules(addedNode, htmlRules);
            paused = false;
          }
          if (textRules.length > 0) {
            applyTextRulesToTree(addedNode, textRules);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // --- Helpers ---

  function buildPattern(rule) {
    if (rule.searchIsRegex) {
      return new RegExp(rule.search, rule.regexFlags || "gi");
    }
    const escaped = rule.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(escaped, rule.regexFlags || "gi");
  }

  function applyHtmlRules(element, rules) {
    let html = element.innerHTML;
    let changed = false;

    for (const rule of rules) {
      let pattern;
      try {
        pattern = buildPattern(rule);
      } catch {
        continue;
      }

      if (pattern.test(html)) {
        pattern.lastIndex = 0;
        html = html.replace(pattern, rule.replace);
        changed = true;
      }
    }

    if (changed) {
      element.innerHTML = html;
    }
  }

  function applyTextRulesToTree(root, rules) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }
    for (const node of nodes) {
      applyTextRulesToNode(node, rules);
    }
  }

  function applyTextRulesToNode(node, rules) {
    let text = node.nodeValue;
    let changed = false;

    for (const rule of rules) {
      let pattern;
      try {
        pattern = buildPattern(rule);
      } catch {
        continue;
      }

      if (pattern.test(text)) {
        pattern.lastIndex = 0;
        text = text.replace(pattern, rule.replace);
        changed = true;
      }
    }

    if (changed) {
      node.nodeValue = text;
    }
  }
})();
