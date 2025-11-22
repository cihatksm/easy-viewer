const express = require('express');
const { UseRender, SchemeManager, Config } = require('../server'); // easy-viewer server exports;
const logger = require('../lib/logger');

function easyViewer() {
    const app = express();
    const port = 3000;

    const schemes = new SchemeManager();
    schemes.load(__dirname + '/schemes');

    const config = new Config();
    config.set(config.names.views, __dirname + '/html');
    config.set(config.names.defaultScheme, 'app');
    config.set(config.names.ignoreErrors, false);

    app.use(UseRender);

    app.get('/', (req, res) => {
        res.render('index', { title: 'Home', description: 'A minimal Easy Viewer example.' });
    });

    // Dynamic pages: render templates from `simple/html/<name>.html`
    // Example: GET /pages/about -> renders `about.html`
    app.get('/pages/:name', (req, res) => {
        const name = String(req.params.name || '').trim();
        // basic validation — Rooter will also validate includes
        if (!/^[A-Za-z0-9_\-\/]+$/.test(name)) return res.status(400).json({ status: 400, message: 'Invalid page name' });
        const title = name.charAt(0).toUpperCase() + name.slice(1);
        return res.render(name, { title, description: '' });
    });

    app.post('/', (req, res) => {
        res.json({ status: 200, message: 'OK' });
    });

    app.listen(port, () => {
        console.info(`Express: http://localhost:${port}`);
    });
}

try {
    easyViewer();
} catch (err) {
    logger.error(err);
}