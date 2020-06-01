const express = require('express');
const createError = require('http-errors');
const path = require('path');

const apiRouter = (chaos) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, './index.html'));
  });

  router.use('/status', require('./status'));
  router.use('/guilds', require('./guilds'));

  chaos.pluginManager.plugins.forEach((plugin) => {
    if (!plugin.webRouter) return;
    chaos.logger.info(`adding webRouter for ${plugin.name}`);
    router.use(`/${plugin.name.toLowerCase()}`, plugin.webRouter);
  });

  // catch 404 and forward to error handler
  router.use(function (req, res, next) {
    next(createError(404));
  });

  // error handler
  router.use(function (err, req, res) {
    res.status(err.status || 500);
    res.send({ 'error': err.message });
  });

  return router;
};

module.exports = {
  apiRouter,
};