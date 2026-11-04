# Newer Toggle Case

Cycle selected text through case formats with `Ctrl+M` on Windows/Linux or `Cmd+M` on macOS. Multiple selections are transformed together and remain selected, including when the result changes length.

This is the `den4md.toggle-case` fork of [Toggle Case by Pranshu Agrawal](https://github.com/pranshuagrawal/vscode-toggle-case), distributed under the original MIT license. It requires VS Code 1.100 or later.

## Install locally

1. Disable the original extension `PranshuAgrawal.toggle-case`. Both extensions retain the same command IDs, so they should not run together.
2. In VS Code, run **Extensions: Install from VSIX...** and choose `newer-toggle-case-0.2.1.vsix` from the `artifacts` directory.
3. Reload VS Code if prompted. Select text and press `Ctrl+M`.

Building a VSIX does not install or publish it. GitHub Release publication is a separate manual step.

## Selection behavior

- The cycle keeps the original order: UPPERCASE, lowercase, Title Case, camelCase, CONSTANT_CASE, dot.case, Header-Case, kebab-case, PascalCase, path/case, Sentence case, snake_case, original.
- Every format uses the original text from the current cycle. The original step restores that text exactly.
- Selection changes, edits outside the command, changes to enabled formats, and editor switches start a new cycle. Original text is held only in memory, never in extension storage.
- Each nonempty selection is transformed independently. Empty cursors do not select or transform words. With only empty cursors, the command does nothing.
- Word boundaries recognize Unicode letters, digits and combining marks, including Cyrillic and mixed-script text.
- Each line is transformed separately, preserving indentation, trailing whitespace, blank lines and line endings. Symbol-only selections are kept when a format would produce an empty string.
- One command is one Undo step. Rapid commands are processed in order.

Existing `toggleCase.case.*` and `toggleCase.notification.notifyOnChange` settings are retained. Use the command palette to transform directly to a specific format. The fork retains the upstream title-case transformation and the legacy `capitalCase` setting; the latter was not part of the original cycle and does not add a new format.

## Development

Use Node.js 24 LTS. Dependencies are locked in `package-lock.json`.

```powershell
npm ci --ignore-scripts
npm run compile
npm run lint
npm test
npm run package
```

`npm test` runs integration tests in a separate VS Code extension host, with user data and extensions under `.vscode-test`. Other installed extensions are disabled. The default test version is 1.145.0. Set `VSCODE_TEST_VERSION` to test another version, or set `VSCODE_EXECUTABLE_PATH` to use an installed executable instead of downloading one. For example:

```powershell
$env:VSCODE_EXECUTABLE_PATH = 'C:\Users\ds\AppData\Local\Programs\Microsoft VS Code\Code.exe'; npm test
```

The debug configurations also use isolated user data. Integration tests cover direct commands, cycling, multiple and reversed selections, empty cursors, Unicode length changes, LF/CRLF, external edits, editor switches, rejected edits and Undo/Redo.

`npm run package` creates `artifacts/newer-toggle-case-0.2.1.vsix`. Build tools, tests and scratch files are excluded from the package. The old Travis configuration, including its automatic Marketplace publishing step, has been removed.

## Dependency checks

Run `npm audit --omit=dev` to check dependencies shipped with the extension. Build/test tooling is checked separately with `npm audit`; unresolved upstream tooling advisories must not be confused with vulnerabilities in the installed VSIX. No forced dependency overrides are used.
