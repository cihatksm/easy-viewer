#### Module Download

```bash
  npm install easy-viewer
```

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)

#### Feedback

**E-mail:** me@cihatksm.com

#### Security / Changelog

- Replaced unsafe `eval`-based template evaluation with a safe, minimal template processor that only allows simple variable substitution (`{{ var }}`) and controlled includes (`{{ include('file') }}`).
- Sanitized include paths to prevent path traversal. Configure views directory via `Config.set(ConfigNames.views, path)` before rendering.
- Fixed middleware `next()` usage and `res.render` API compatibility.

If you rely on complex template expressions, consider integrating a battle-tested template engine (e.g. EJS, Handlebars) instead of using the built-in processor.

#### Performance / optimization

- Added an in-memory view cache to reduce disk reads for repeated include calls.
- Introduced a singleton `config` instance exported from the module for faster access.
- Escapes injected variable values by default to reduce XSS risk.
- Cache invalidation: views cache is revalidated by file mtime and a TTL (default 60s). The cache also listens for file changes (where supported) and clears affected entries.
