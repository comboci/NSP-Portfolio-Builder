# Research PDF downloader (Windows)

Run `Download-Research-Resources.cmd` from this repository folder in Windows. It invokes the accompanying PowerShell file (inspect it first if preferred). Files are saved automatically to `NSP_Research_Resources` beside the repository's `index.html`, without a folder picker. The JSON report is written in the same output directory.

The downloader retries failed downloads up to three times, displays per-file progress, and validates the PDF header and EOF before treating a download as successful. Existing valid files are preserved. URLs that point to HTML publisher pages are logged as `publisher_page` instead of being saved as fake PDFs. Publisher-side 403/404 errors, expiring links, login requirements, and throttling cannot be circumvented; these are reported as errors.

This independent local helper avoids browser CORS restrictions. It cannot be started automatically by a standalone HTML page, because browsers do not permit web pages to execute local programs. The in-app browser downloader remains available for publishers that allow cross-origin PDF reads. Research reference documents are for evaluation and are not embedded as copyrighted assets inside templates.
