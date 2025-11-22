const { readFileSync, readdirSync, promises: fsPromises } = require('node:fs');
const { join } = require('node:path');

const schemeStore = new Map();

class SchemeManager {
    load(schemeDirectory) {
        try {
            const schemes = readdirSync(schemeDirectory).filter(file => file.endsWith('.html'));
            for (const scheme of schemes) {
                const name = scheme.split('.')[0];
                const filePath = join(schemeDirectory, scheme);
                const html = readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
                schemeStore.set(name, { name, file: filePath, html });
            }
        } catch (err) {
            throw new Error(`Failed to load schemes from ${schemeDirectory}: ${err && err.message ? err.message : err}`);
        }
    }

    async loadAsync(schemeDirectory) {
        try {
            const files = await fsPromises.readdir(schemeDirectory);
            const schemes = files.filter(file => file.endsWith('.html'));
            const readPromises = schemes.map(async (scheme) => {
                const name = scheme.split('.')[0];
                const filePath = join(schemeDirectory, scheme);
                const html = (await fsPromises.readFile(filePath, 'utf8')).replace(/\r\n/g, '\n');
                return { name, file: filePath, html };
            });
            const results = await Promise.all(readPromises);
            for (const item of results) {
                schemeStore.set(item.name, item);
            }
        } catch (err) {
            throw new Error(`Failed to load schemes asynchronously from ${schemeDirectory}: ${err && err.message ? err.message : err}`);
        }
    }

    get(name) {
        return schemeStore.get(name) || null;
    }

    get_all() {
        return Array.from(schemeStore.values());
    }

    delete(name) {
        return schemeStore.delete(name);
    }

    clear() {
        schemeStore.clear();
    }

    has(name) {
        return schemeStore.has(name);
    }

    size() {
        return schemeStore.size;
    }
}

module.exports = SchemeManager;
