const util = require('node:util');

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

function ts() {
    return new Date().toISOString();
}

function format(color, ...args) {
    const message = util.format(...args);
    return `${GRAY}[${ts()}]${RESET} ${color}▲ easy-viewer:${RESET} ${message}`;
}

module.exports = {
    info: (...args) => console.log(format(GREEN, ...args)),
    warn: (...args) => console.warn(format(YELLOW, ...args)),
    error: (...args) => {
        // if first arg is Error, print its stack
        if (args[0] instanceof Error) {
            const err = args[0];
            console.error(format(RED, err.stack || err.message));
            for (let i = 1; i < args.length; i++) console.error(format(RED, args[i]));
        } else {
            console.error(format(RED, ...args));
        }
    },
    debug: (...args) => console.log(format(CYAN, ...args)),
};
