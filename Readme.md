# easy-viewer

Minimal, secure, lightweight template preprocessor and viewer utility for serving static or simple template views quickly.

Designed for small projects, demo servers, or apps that don't require a full-featured template engine. The built-in processor allows only simple variable substitution (`{{ var }}`) and controlled includes (`{{ include('file') }}`).

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

## Quick Start

1. Place your views in a directory within the project.
2. Configure the views path: `Config.set(ConfigNames.views, yourViewsPath)`.
3. Render templates from your app or use the provided middleware/example in the `simple/` folder.

See `simple/` for a minimal example server.

## Contributing

Feedback and issues: `me@cihatksm.com` or open an issue in the repository.

## License

MIT — see the `LICENSE` file for details.

---

## This package is intentionally small and focused: it provides a safe, low-dependency solution for simple view rendering. If you'd like, I can add usage examples or an English/expanded API section to the README.

Küçük ama dikkatli bir şekilde tasarlanmış bu paket, basit sunum ihtiyaçlarına güvenli ve düşük bağımlılıklı bir çözüm sunar. Daha fazla örnek veya API belgelemesi isterseniz haber verin, örnekleri genişleteyim.
