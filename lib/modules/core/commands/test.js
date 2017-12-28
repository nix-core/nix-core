const Rx = require('rx');

module.exports = {
  name: 'test',
  description: 'Test command',
  scope: 'text',
  showInHelp: false,
  enabledByDefault: false,

  run(context, response) {
    response.content = "This was a test.";
    return response.send();
  },
};