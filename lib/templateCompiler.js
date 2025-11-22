const acorn = require('acorn');

const templateCache = new Map();

function validateExpression(ast) {
    const allowed = new Set([
        'Literal', 'Identifier', 'MemberExpression', 'BinaryExpression', 'UnaryExpression', 'LogicalExpression', 'ConditionalExpression', 'ArrayExpression', 'ObjectExpression'
    ]);
    let unsafe = false;
    (function walk(node) {
        if (!node || typeof node.type !== 'string') return;
        if (!allowed.has(node.type)) { unsafe = true; return; }
        switch (node.type) {
            case 'Identifier':
                if (/^(process|require|global|Function|eval|window|module|this|constructor|__proto__|prototype)$/.test(node.name)) unsafe = true;
                break;
            case 'MemberExpression':
                if (node.computed) { unsafe = true; return; }
                if (!node.property || node.property.type !== 'Identifier') { unsafe = true; return; }
                if (/^(constructor|__proto__|prototype)$/.test(node.property.name)) { unsafe = true; return; }
                walk(node.object);
                break;
            case 'BinaryExpression': case 'LogicalExpression':
                walk(node.left); walk(node.right); break;
            case 'UnaryExpression':
                walk(node.argument); break;
            case 'ConditionalExpression':
                walk(node.test); walk(node.consequent); walk(node.alternate); break;
            case 'ArrayExpression':
                for (const el of node.elements) walk(el); break;
            case 'ObjectExpression':
                for (const prop of node.properties) walk(prop.value); break;
            case 'Literal':
                break;
            default:
                unsafe = true; break;
        }
    })(ast);
    return !unsafe;
}

function compile(template) {
    if (templateCache.has(template)) return templateCache.get(template);

    const parts = [];
    const regex = /{{\s*([\s\S]+?)\s*}}/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(template)) !== null) {
        if (match.index > lastIndex) parts.push({ type: 'text', value: template.slice(lastIndex, match.index) });
        const code = match[1].trim();

        const includeMatch = code.match(/^include\s*\(\s*(?:'([^']+)'|"([^\"]+)"|([A-Za-z0-9_.]+))\s*\)\s*;?$/);
        if (includeMatch) {
            parts.push({ type: 'include', value: includeMatch[1] || includeMatch[2] || includeMatch[3] });
            lastIndex = regex.lastIndex;
            continue;
        }

        if (/^[A-Za-z0-9_.]+$/.test(code)) {
            parts.push({ type: 'ident', value: code });
            lastIndex = regex.lastIndex;
            continue;
        }

        try {
            if (code.length > 800) { parts.push({ type: 'unsafe' }); lastIndex = regex.lastIndex; continue; }
            const ast = acorn.parseExpressionAt(code, 0, { ecmaVersion: 2020 });
            const ok = validateExpression(ast);
            if (!ok) { parts.push({ type: 'unsafe' }); }
            else { parts.push({ type: 'expr', value: code }); }
        } catch (err) {
            parts.push({ type: 'unsafe' });
        }

        lastIndex = regex.lastIndex;
    }
    if (lastIndex < template.length) parts.push({ type: 'text', value: template.slice(lastIndex) });

    const compiled = { parts };
    templateCache.set(template, compiled);
    return compiled;
}

async function renderCompiledAsync(compiled, data, includeResolver, escapeHtml, vm) {
    let out = '';
    for (const part of compiled.parts) {
        if (part.type === 'text') out += part.value;
        else if (part.type === 'include') {
            const file = part.value;
            // includeResolver should return rendered string or ''
            try {
                out += (await includeResolver(file)) || '';
            } catch (err) {
                out += '';
            }
        } else if (part.type === 'ident') {
            const code = part.value;
            const parts = code.split('.');
            let unsafeProp = false;
            for (const p of parts) if (/^(constructor|__proto__|prototype|process|require|global)$/.test(p)) unsafeProp = true;
            if (unsafeProp) { /* skip */ }
            else {
                let val = data;
                for (const p of parts) {
                    if (val && Object.prototype.hasOwnProperty.call(val, p)) val = val[p];
                    else { val = undefined; break; }
                }
                if (val !== undefined && val !== null) out += escapeHtml(String(val));
            }
        } else if (part.type === 'expr') {
            try {
                const sandbox = {};
                if (data && typeof data === 'object') {
                    for (const k of Object.keys(data)) sandbox[k] = data[k];
                }
                sandbox.include = includeResolver;
                sandbox.escapeHtml = escapeHtml;
                const value = vm.runInNewContext(part.value, sandbox, { timeout: 50 });
                if (value !== undefined && value !== null) out += escapeHtml(String(value));
            } catch (err) { /* skip errors */ }
        } else { /* unsafe */ }
    }
    return out;
}

function renderCompiledSync(compiled, data, includeResolverSync, escapeHtml, vm) {
    let out = '';
    for (const part of compiled.parts) {
        if (part.type === 'text') out += part.value;
        else if (part.type === 'include') {
            const file = part.value;
            try {
                out += (includeResolverSync(file)) || '';
            } catch (err) { out += ''; }
        } else if (part.type === 'ident') {
            const code = part.value;
            const parts = code.split('.');
            let unsafeProp = false;
            for (const p of parts) if (/^(constructor|__proto__|prototype|process|require|global)$/.test(p)) unsafeProp = true;
            if (unsafeProp) { /* skip */ }
            else {
                let val = data;
                for (const p of parts) {
                    if (val && Object.prototype.hasOwnProperty.call(val, p)) val = val[p];
                    else { val = undefined; break; }
                }
                if (val !== undefined && val !== null) out += escapeHtml(String(val));
            }
        } else if (part.type === 'expr') {
            try {
                const sandbox = {};
                if (data && typeof data === 'object') {
                    for (const k of Object.keys(data)) sandbox[k] = data[k];
                }
                sandbox.include = includeResolverSync;
                sandbox.escapeHtml = escapeHtml;
                const value = vm.runInNewContext(part.value, sandbox, { timeout: 50 });
                if (value !== undefined && value !== null) out += escapeHtml(String(value));
            } catch (err) { /* skip errors */ }
        } else { /* unsafe */ }
    }
    return out;
}

module.exports = { compile, templateCache, renderCompiledAsync, renderCompiledSync };
