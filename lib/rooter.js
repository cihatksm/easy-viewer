const { readFileSync, statSync, watch, promises: fsPromises } = require('node:fs');
const { join } = require('node:path');

const { viewCache, watchedViews } = require('./cache');
const { compile, renderCompiledAsync, renderCompiledSync } = require('./templateCompiler');

const escapeHtml = require('./utils');
const logger = require('./logger');

const SchemeManager = require('./schemeManager');
const Config = require('./config');

const config = new Config();

class Rooter {
    constructor(request) {
        if (!request) throw new Error('Error: Request is not defined.');
        this.request = request;
        this.errors = [];
    }

    async render(file_name, data = {}, scheme = config.get(config.names.defaultScheme)) {
        this.request.res.setHeader('Content-Type', 'text/html');
        data = { ...data, ...(this.request?.data || {}) };

        let html = await this.getHtml(file_name, data, scheme);
        if (this.errors.length > 0 && !config.get(config.names.ignoreErrors)) {
            logger.error('Page not rendered because of errors, please first fix the errors.');
            this.errors.forEach(error => logger.error(error));
            return this.json({ status: 500, message: 'Internal Server Error.' });
        }
        return this.request.res.send(html);
    }

    async getHtml(file_name, data = {}, scheme) {
        const schemeType = typeof scheme;
        const schemeManager = new SchemeManager();
        if (schemeType == 'string') scheme = schemeManager.get(scheme) || null;
        else if (schemeType == 'object') scheme = schemeManager.get(scheme?.name) || null;

        if (!data || typeof data !== 'object') data = {};

        let html = scheme?.html;
        if (!html || html.length === 0) {
            return this.json({ status: 404, message: 'Html scheme not found.' });
        }

        data.file_name = file_name;

        return await this.runAsync(data, html);
    }

    async json(data = {}) {
        this.request.res.setHeader('Content-Type', 'application/json');
        return this.request.res.json(data);
    }

    async file(location) {
        try {
            return await fsPromises.readFile(join(__dirname, location), 'utf8');
        } catch (error) {
            return error.message;
        }
    }

    // Synchronous render API (kept for compatibility with tests and existing callers)
    run(data, content) {

        const compiled = compile(content);
        const views_dir = config.get(config.names.views);

        const includeResolverSync = (file) => {
            // allow include identifiers (e.g. include(file_name)) — resolve from data
            if (typeof file === 'string' && /^[A-Za-z0-9_.]+$/.test(file)) {
                const ident = file;
                if (ident.indexOf('.') !== -1) {
                    const parts = ident.split('.');
                    let cur = data;
                    for (const p of parts) {
                        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
                        else { cur = undefined; break; }
                    }
                    if (typeof cur === 'string' && cur.length > 0) file = cur;
                } else {
                    if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, ident)) {
                        const val = data[ident];
                        if (typeof val === 'string' && val.length > 0) file = val;
                    }
                }
            }
            if (!views_dir) { this.errors.push(new Error('Views directory not configured')); return ''; }
            if (typeof file !== 'string' || file.indexOf('..') !== -1 || file.startsWith('/') || file.startsWith('\\')) {
                this.errors.push(new Error('Invalid include file path')); return '';
            }
            const allowed = /^[A-Za-z0-9_\-\/]+$/;
            if (!allowed.test(file)) { this.errors.push(new Error('Include file name contains illegal characters')); return ''; }

            const dir = join(views_dir, `${file}.html`);
            try {
                if (!watchedViews.has(views_dir)) {
                    watchedViews.add(views_dir);
                    try { watch(views_dir, { recursive: true }, () => { /* noop */ }); }
                    catch (err) { /* ignore */ }
                }

                const stat = statSync(dir);
                const mtime = stat.mtimeMs;
                const ttl = parseInt(config.get(config.names.viewsCacheTtl) || 60000, 10);

                let fileContent;
                if (viewCache.has(dir)) {
                    const entry = viewCache.get(dir);
                    const now = Date.now();
                    if (entry.mtimeMs === mtime && (now - (entry.cachedAt || 0)) < ttl) {
                        fileContent = entry.content;
                    }
                }
                if (!fileContent) {
                    fileContent = readFileSync(dir, 'utf8');
                    viewCache.set(dir, { content: fileContent, mtimeMs: mtime, cachedAt: Date.now() });
                }

                const compiledChild = compile(fileContent);
                return renderCompiledSync(compiledChild, data, includeResolverSync, escapeHtml, require('node:vm'));
            } catch (error) { this.errors.push(error); return ''; }
        };

        return renderCompiledSync(compiled, data, includeResolverSync, escapeHtml, require('node:vm'));
    }

    // Async render API used in request flow to avoid blocking the event loop
    async runAsync(data, content) {
        const compiled = compile(content);
        const views_dir = config.get(config.names.views);

        const includeResolverAsync = async (file) => {
            // allow include identifiers (e.g. include(file_name)) — resolve from data
            if (typeof file === 'string' && /^[A-Za-z0-9_.]+$/.test(file)) {
                const ident = file;
                if (ident.indexOf('.') !== -1) {
                    const parts = ident.split('.');
                    let cur = data;
                    for (const p of parts) {
                        if (cur && Object.prototype.hasOwnProperty.call(cur, p)) cur = cur[p];
                        else { cur = undefined; break; }
                    }
                    if (typeof cur === 'string' && cur.length > 0) file = cur;
                } else {
                    if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, ident)) {
                        const val = data[ident];
                        if (typeof val === 'string' && val.length > 0) file = val;
                    }
                }
            }
            if (!views_dir) { this.errors.push(new Error('Views directory not configured')); return ''; }
            if (typeof file !== 'string' || file.indexOf('..') !== -1 || file.startsWith('/') || file.startsWith('\\')) {
                this.errors.push(new Error('Invalid include file path')); return '';
            }
            const allowed = /^[A-Za-z0-9_\-\/]+$/;
            if (!allowed.test(file)) { this.errors.push(new Error('Include file name contains illegal characters')); return ''; }

            const dir = join(views_dir, `${file}.html`);
            try {
                if (!watchedViews.has(views_dir)) {
                    watchedViews.add(views_dir);
                    try { watch(views_dir, { recursive: true }, () => { /* noop */ }); }
                    catch (err) { /* ignore */ }
                }

                const stat = await fsPromises.stat(dir);
                const mtime = stat.mtimeMs;
                const ttl = parseInt(config.get(config.names.viewsCacheTtl) || 60000, 10);

                let fileContent;
                if (viewCache.has(dir)) {
                    const entry = viewCache.get(dir);
                    const now = Date.now();
                    if (entry.mtimeMs === mtime && (now - (entry.cachedAt || 0)) < ttl) {
                        fileContent = entry.content;
                    }
                }
                if (!fileContent) {
                    fileContent = await fsPromises.readFile(dir, 'utf8');
                    viewCache.set(dir, { content: fileContent, mtimeMs: mtime, cachedAt: Date.now() });
                }

                const compiledChild = compile(fileContent);
                return await renderCompiledAsync(compiledChild, data, includeResolverAsync, escapeHtml, require('node:vm'));
            } catch (error) { this.errors.push(error); return ''; }
        };

        return await renderCompiledAsync(compiled, data, includeResolverAsync, escapeHtml, require('node:vm'));
    }
}

module.exports = Rooter;
