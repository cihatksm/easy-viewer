/**
 * @typedef {import('./lib/rooter').Rooter} RooterClass
 * @typedef {import('express').Response & { render: RooterClass['render'] }} ResponseWithRender
 */

const UseRender = require('./lib/useRender');
const Rooter = require('./lib/rooter');
const SchemeManager = require('./lib/schemeManager');
const Config = require('./lib/config');

module.exports = { UseRender, Rooter, SchemeManager, Config };