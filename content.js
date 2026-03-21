/**
 * Content script: runs on every page, checks URL against stored rules,
 * and performs text replacements in the DOM.
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
      // Plain string: treat as substring match
      return currentUrl.includes(group.urlPattern);
    } catch {
      return false;
    }
  });

  if (matchingGroups.length === 0) return;

  // Collect all search/replace pairs from matching groups
  const replacements = matchingGroups.flatMap((group) =>
    (group.replacements || []).filter((r) => r.enabled !== false)
  );

  if (replacements.length === 0) return;

  // Walk all text nodes and apply replacements
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  for (const node of textNodes) {
    let text = node.nodeValue;
    let changed = false;

    for (const rule of replacements) {
      let pattern;
      try {
        if (rule.searchIsRegex) {
          pattern = new RegExp(rule.search, rule.regexFlags || "g");
        } else {
          // Escape special regex chars for literal matching, global replace
          const escaped = rule.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          pattern = new RegExp(escaped, "g");
        }
      } catch {
        continue;
      }

      if (pattern.test(text)) {
        // Reset lastIndex after test() for global regexes
        pattern.lastIndex = 0;
        text = text.replace(pattern, rule.replace);
        changed = true;
      }
    }

    if (changed) {
      node.nodeValue = text;
    }
  }

  // Observe future DOM changes and apply replacements to new nodes
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType === Node.TEXT_NODE) {
          applyToTextNode(addedNode, replacements);
        } else if (addedNode.nodeType === Node.ELEMENT_NODE) {
          const innerWalker = document.createTreeWalker(
            addedNode,
            NodeFilter.SHOW_TEXT,
            null
          );
          while (innerWalker.nextNode()) {
            applyToTextNode(innerWalker.currentNode, replacements);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  function applyToTextNode(node, rules) {
    let text = node.nodeValue;
    let changed = false;
    for (const rule of rules) {
      let pattern;
      try {
        if (rule.searchIsRegex) {
          pattern = new RegExp(rule.search, rule.regexFlags || "g");
        } else {
          const escaped = rule.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          pattern = new RegExp(escaped, "g");
        }
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
