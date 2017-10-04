const Rx = require('rx');

const Response = require('./response');

class ParsedCommand {
  /**
   *
   * @param command
   * @param context
   */
  constructor(command, context) {
    this._command = command;
    this._context = context;
  }

  get command() {
    return this._command;
  }

  get context() {
    return this._context;
  }

  run() {
    let response = new Response(this.context.message);

    if (this.command.adminOnly) {
      if (this.context.user.id !== this.context.nix.owner.id) {
        return Rx.Observable.empty();
      }
    }

    if (this.context.hasFlag('help')) {
      return sendHelpResponse(this.context.message, this.command);
    }


    if (this.command.scope) {
      let channelScopes;
      if (typeof this.command.scope === 'string') {
        channelScopes = [this.command.scope];
      }
      else {
        channelScopes = this.command.scope;
      }

      if (channelScopes.indexOf(this.context.channel.type) === -1) {
        response.type = 'message';

        if (this.command.scope === 'text') {
          response.content = this.context.nix.responseStrings.commandParsing.error.wrongScope.textChannelOnly;
        }
        else {
          response.content = this.context.nix.responseStrings.commandParsing.error.wrongScope.general;
        }

        return response.send();
      }
    }

    if (Object.keys(this.context.args).length < this.command.requiredArgs.length) {
      let content = this.context.nix.responseStrings.commandParsing.error.missingArgument;
      return sendHelpResponse(this.context.message, this.command, content);
    }

    return Rx.Observable.just(null)
      .map(() => this.command.run(this.context, response))
      .flatMap((cmdExit) => {
        if (cmdExit instanceof Rx.Observable) {
          return cmdExit;
        }
        else if (typeof cmdExit.then === 'function') {
          return Rx.Observable.fromPromise(cmdExit);
        }
        else {
          return Rx.Observable.just(cmdExit);
        }
      })
      .catch((error) => {
        return handleError(this.context, error);
      });
  }
}

function sendHelpResponse(message, command, content = '') {

  let usageField = {
    name: 'Usage',
    value: '!' + command.name,
  };

  let argsList = [];
  let flagsList = [];

  command.flags
    .filter((flag) => typeof flag.showInHelp === 'undefined' || flag.showInHelp === true)
    .forEach((flag) => {
      let namePart = '';
      let aliasPart = '';
      let descPart = '';

      if (flag.shortAlias) {
        aliasPart = '( -' + flag.shortAlias + ' )';
      }

      if (flag.required) {
        usageField.value += ' --' + flag.name;
        namePart = '**--' + flag.name + '** ' + aliasPart;
        descPart = flag.description;
      } else {
        usageField.value += ' [--' + flag.name + ']';
        namePart = '*--' + flag.name + '* ' + aliasPart;
        descPart = '(optional) ' + flag.description;
      }

      flagsList.push(namePart + ': ' + descPart);
    });

  command.args
    .filter((arg) => typeof arg.showInHelp === 'undefined' || arg.showInHelp === true)
    .forEach((arg) => {
      if (arg.required) {
        usageField.value += ' <' + arg.name + '>';
        argsList.push('**' + arg.name + '**: ' + arg.description);
      } else {
        usageField.value += ' [' + arg.name + ']';
        argsList.push('**' + arg.name + '** (optional): ' + arg.description);
      }
    });

  let embed = {
    title: this.name,
    description: this.description,
    fields: [usageField],
  };

  if (argsList.length >= 1) {
    embed.fields.push({
      name: 'Arguments',
      value: argsList.join('\n'),
    });
  }

  if (flagsList.length >= 1) {
    embed.fields.push({
      name: 'Flags',
      value: flagsList.join('\n'),
    });
  }

  let response = new Response(message, 'embed', content, embed);
  return response.send();
}

function handleError(context, error) {
  console.error(error);

  context.nix.messageOwner(
    context.nix.responseStrings.commandRun.unhandledException.forOwner,
    {embed: createErrorEmbed(context, error)}
  );

  let userResponse = new Response(context.message);
  userResponse.type = 'message';
  userResponse.content = context.nix.responseStrings.commandRun.unhandledException.forUser({ owner: context.nix.owner });
  return userResponse.send();
}

function createErrorEmbed(context, error) {
  let embed = {
    title: this.name,
    description: this.description,

    fields: [
      {
        name: 'Error:',
        value: error.message,
      },
      {
        name: 'User:',
        value: context.user.tag,
      },
      {
        name: 'Message:',
        value: context.message.content,
      },
      {
        name: 'Channel Type:',
        value: context.channel.type,
      },
    ],
  };

  if (context.channel.type === 'text') {
    embed.fields.push({
      name: 'Guild:',
      value: context.channel.guild.name,
    });
    embed.fields.push({
      name: 'Channel:',
      value: context.channel.name,
    });
  }
  else if (context.channel.type === 'group') {
    embed.fields.push({
      name: 'Recipients:',
      value: users.map((user) => user.tag).join(', '),
    });
  }

  let stack = error.stack.split('\n');
  let stackString = '';
  let nextLine = stack.shift();

  while (nextLine && (stackString + '\n' + nextLine).length <= 1008) {
    stackString += '\n' + nextLine;
    nextLine = stack.shift();
  }

  if (stack.length >= 1) {
    stackString += '\n  ...';
  }

  embed.fields.push({
    name: 'Stack:',
    value: stackString,
  });

  return embed;
}

module.exports = ParsedCommand;