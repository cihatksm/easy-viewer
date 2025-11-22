const configStore = new Map();
const logger = require('./logger');

/**
 * Configuration Names
 * @readonly
 * @enum {string}
 */
class ConfigNames {
    static views = 'views';
    static defaultScheme = 'default_scheme';
    static ignoreErrors = 'ignore_errors';
    static viewsCacheTtl = 'views_cache_ttl';
    static doubleBraceRaw = 'double_brace_raw';
}

class Config {
    /**
     * 
     * @param {keyof typeof ConfigNames} key This config key
     * @param {any} value This config value
     */
    set(key, value) {
        if (!Object.values(ConfigNames).includes(key)) {
            logger.error(`Invalid key: ${key}`);
        } else {
            if (configStore.has(key)) configStore.delete(key);
            configStore.set(key, { key, value });
        }
    }

    /**
     * 
     * @param {keyof typeof ConfigNames} key This config key
     * @returns 
     */
    get(key) {
        return (configStore.get(key) || {})?.value;
    }

    /**
     * @returns {typeof ConfigNames} This class's ConfigNames static members
     */
    names = ConfigNames;
}

module.exports = Config;
