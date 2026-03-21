# PageMorph

Firefox extension that automatically replaces text on web pages. Define search/replace rules (plain text or regex) scoped to URL patterns.

## Features

- **URL-scoped rules** — each rule group targets pages matching a URL pattern (regex or substring)
- **Regex or plain text** — both URL patterns and search strings support regex
- **Unlimited rules** — add as many search/replace pairs per URL pattern as you need
- **Per-rule toggle** — enable/disable individual replacements
- **Live replacement** — handles dynamically loaded content via MutationObserver
- **Import/Export** — back up and share your rules as JSON

## Install (temporary, for development)

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on..."**
3. Select the `manifest.json` file from this repo

The extension will remain active until you restart Firefox.

## Install (permanent, unsigned)

1. Navigate to `about:config` and set `xpinstall.signatures.required` to `false` (Firefox Developer Edition / Nightly only)
2. Zip the extension files: `zip -r pagemorph.xpi manifest.json content.js popup/ options/ icons/`
3. Open `about:addons`, click the gear icon, select **"Install Add-on From File..."**, and choose `pagemorph.xpi`

## Usage

1. Click the PageMorph icon in the toolbar to see active rules for the current page
2. Click **"Manage Rules"** (or go to the extension's options page) to configure rules
3. Add a URL pattern (e.g. `example\.com` with regex enabled)
4. Add one or more search/replace pairs under that pattern
5. Reload the page — matched text will be replaced automatically

## Example

To replace "banana" with "ananas" on example.com:

| Field       | Value          |
|-------------|----------------|
| URL pattern | `example\.com` |
| URL regex   | checked        |
| Search      | `banana`       |
| Replace     | `ananas`       |
| Regex       | unchecked      |
