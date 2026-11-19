# NSP Portfolio Builder

The browser entry point is `index.html`. Tauri 2 embeds that same file as the Windows desktop frontend.

## Run locally on Windows

Install the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/) and the Tauri 2 CLI. From the repository root, run:

```powershell
cargo install tauri-cli --version '^2' --locked
cargo tauri dev --no-dev-server
```

The development command uses bundled HTML and the desktop app origin. To verify the Windows installer separately, run `cargo tauri build --bundles nsis`.

## Data and permissions

- Browser and desktop keep the same localStorage keys and JSON schema. Their storage profiles are separate. To move an existing portfolio, export its JSON from the browser and import it in the desktop app. Keep the original browser data and the exported file until the import has been checked.
- The Rust startup code creates `%LOCALAPPDATA%\com.nspelectronics.portfoliobuilder\storage` for future native storage. The SQLite phase can place `portfolio.sqlite3` there. This release keeps project persistence in localStorage.
- Desktop file import, image selection, export and printing use the existing browser APIs. The webview has zero native command permissions and an empty file asset scope.
- The desktop Content Security Policy keeps Tauri's inline script hashes and allows the existing inline event handlers and dynamic styles. HTML5 drag and drop remains enabled in WebView2.
