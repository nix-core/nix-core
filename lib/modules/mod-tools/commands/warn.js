const Rx = require('rx');
const Discord = require('discord.js');

const {addModLogEntry} = require('../utility');

module.exports = {
  name: 'warn',
  description: 'Issue a warning to a user',
  scope: ['text'],
  permissions: ['admin', 'mod'],
  args: [
    {
      name: 'user',
      description: 'The user to warn, by mention or user id',
      required: true,
    },
    {
      name: 'reason',
      description: 'The reason for the warning',
      required: false,
      greedy: true,
    },
  ],

  run(context, response) {
    let guild = context.guild;
    let userString = context.args.user;
    let reason = context.args.reason;

    let user = guild.members.find((u) => u.toString() === userString)
    return Rx.Observable.if(
        () => user,
        Rx.Observable.return(user),
        Rx.Observable.fromPromise(context.nix.discord.users.fetch(userString))
      )
      .flatMap((user) => {
        let warningEmbed = new Discord.MessageEmbed();
        warningEmbed
          .setThumbnail(guild.iconURL())
          .setTitle('WARNING')
          .setDescription(reason)
          .addField('Server', guild.name);

        return Rx.Observable
          .fromPromise(user.send({
            content: 'You have been issued a warning.',
            embed: warningEmbed,
          }))
          .map(() => user);
      })
      .flatMap((user) => {
        let modLogEmbed = new Discord.MessageEmbed();
        modLogEmbed
          .setTitle('Issued Warning')
          .setThumbnail(user.avatarURL())
          .setColor(Discord.Constants.Colors.DARK_ORANGE)
          .addField('To user', user, true)
          .addField('From moderator', context.member, true)
          .addField('Reason', reason || '`none given`');

        return addModLogEntry(context, modLogEmbed)
          .map(() => user);
      })
      .flatMap((user) => {
        response.content = `${user.tag} has been warned`;
        return response.send();
      });
  },
}