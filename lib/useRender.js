const logger = require('./logger');
const Rooter = require('./rooter');
const Config = require('./config');

function UseRender(request, response, next) {
    if (!request || !response) {
        const error = new Error('Error: Request or Response is not defined.');
        logger.error(error);
        return next(error);
    }

    const method = request.method;
    if (method !== 'GET') {
        return next();
    }

    const config = new Config();

    const _data = request?.data || {};
    const _defaultScheme = _data?._scheme || config.get(config.names.defaultScheme);

    const rooter = new Rooter(request);
    const render = (file_name, data, scheme) => {
        const merged = { ..._data, ...(data || {}) };
        const effectiveScheme = (typeof scheme !== 'undefined' && scheme !== null) ? scheme : (merged?._scheme || _defaultScheme);
        return rooter.render(file_name, merged, effectiveScheme);
    };
    response.render = render;

    next();
}

module.exports = UseRender;
