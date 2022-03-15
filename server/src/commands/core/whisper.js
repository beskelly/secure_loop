/*
  Description: Display text on targets screen that only they can see
*/

import * as UAC from '../utility/UAC/_info';
import './encrypt.js';

// module support functions

function parseText(text) {
  // verifies user input is text
  if (typeof text !== 'string') {
    return false;
  }

  let sanitizedText = text;

  // strip newlines from beginning and end
  sanitizedText = sanitizedText.replace(/^\s*\n|^\s+$|\n\s*$/g, '');
  // replace 3+ newlines with just 2 newlines
  sanitizedText = sanitizedText.replace(/\n{3,}/g, '\n\n');

  return sanitizedText;
}

// module main
export async function run(core, server, socket, payload) {
  // check user input
  const text = parseText(payload.text);
  const encrypted = encrypt(text, 5);
  const decrypted = decrypt(encrypted, 5);

  if (!text) {
    // lets not send objects or empty text, yea?
    return server.police.frisk(socket.address, 13);
  }

  // check for spam
  const score = text.length / 83 / 4;
  if (server.police.frisk(socket.address, score)) {
    return server.reply({
      cmd: 'warn',
      text: 'You are sending too much text. Wait a moment and try again.\nPress the up arrow key to restore your last message.',
    }, socket);
  }

  const targetNick = payload.nick;
  if (!UAC.verifyNickname(targetNick)) {
    return true;
  }

  // find target user
  let targetClient = server.findSockets({ channel: socket.channel, nick: targetNick });

  if (targetClient.length === 0) {
    return server.reply({
      cmd: 'warn',
      text: 'Could not find user in channel',
    }, socket);
  }

  [targetClient] = targetClient;

  server.reply({
    cmd: 'info',
    type: 'whisper',
    from: socket.nick,
    trip: socket.trip || 'null',
    text: `${socket.nick} whispered: ${decrypted}`,
  }, targetClient);

  targetClient.whisperReply = socket.nick;

  server.reply({
    cmd: 'info',
    type: 'whisper',
    text: `You whispered to @${targetNick}: ${decrypted}`,
  }, socket);

  return true;
}

// module hook functions
export function initHooks(server) {
  server.registerHook('in', 'chat', this.whisperCheck.bind(this), 20);
}

// hooks chat commands checking for /whisper
export function whisperCheck(core, server, socket, payload) {
  if (typeof payload.text !== 'string') {
    return false;
  }

  if (payload.text.startsWith('/whisper') || payload.text.startsWith('/w ')) {
    const input = payload.text.split(' ');

    // If there is no nickname target parameter
    if (input[1] === undefined) {
      server.reply({
        cmd: 'warn',
        text: 'Refer to `/help whisper` for instructions on how to use this command.',
      }, socket);

      return false;
    }

    const target = input[1].replace(/@/g, '');
    input.splice(0, 2);
    const whisperText = input.join(' ');
    const newEncrypted = encrypt(whisperText, 5);
    const newDecrypted = decrypt(newEncrypted, 5);

    this.run(core, server, socket, {
      cmd: 'whisper',
      nick: target,
      text: newDecrypted,
    });

    return false;
  }

  if (payload.text.startsWith('/r ')) {
    if (typeof socket.whisperReply === 'undefined') {
      server.reply({
        cmd: 'warn',
        text: 'Cannot reply to nobody',
      }, socket);

      return false;
    }

    const input = payload.text.split(' ');
    input.splice(0, 1);
    const whisperText = input.join(' ');

    this.run(core, server, socket, {
      cmd: 'whisper',
      nick: socket.whisperReply,
      text: newDecrypted,
    });

    return false;
  }

  return payload;
}

export const requiredData = ['nick', 'text'];
export const info = {
  name: 'whisper',
  description: 'Display text on targets screen that only they can see',
  usage: `
    API: { cmd: 'whisper', nick: '<target name>', text: '<text to whisper>' }
    Text: /whisper <target name> <text to whisper>
    Text: /w <target name> <text to whisper>
    Alt Text: /r <text to whisper, this will auto reply to the last person who whispered to you>`,
};

// function encrypt(text, s)
//     {
//         let result="";
//         for (let i = 0; i < text.length; i++)
//         {
//             let char = text[i];
//             if (char.toUpperCase(text[i]))
//             {
//                 let ch =  String.fromCharCode((char.charCodeAt(0) + s-65) % 26 + 65);
//                 result += ch;
//             }
//             else if (char.toLowerCase(text[i]))
//             {
//                 let ch = String.fromCharCode((char.charCodeAt(0) + s-97) % 26 + 97);
//                 result += ch;
//             }
//             else if (char == ' ')
//             {
//                 result += ' ';
//             }
//         }
//         return result;
//     }

function encrypt(text, s) {
  const alphabetArray = "abcdefghijklmnopqrstuvwxyz".split("");
  const capitalsArray = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let output = "";

  for (var i = 0; i < text.length; i++) {
    var myCode = text.charCodeAt(i);
    if (alphabetArray.includes(text[i])) {
      if (myCode + s > 122) {
        output += String.fromCharCode(myCode - 26 + s);
      } else {
        output += String.fromCharCode(myCode + s);
      }
      
    } 
    
    else if (capitalsArray.includes(text[i])) {
      if (myCode + s > 90) {
        output += String.fromCharCode(myCode - 26 + s);
      } else {
        output += String.fromCharCode(myCode + s);
      }

    } 
    
    else {
      output += String.fromCharCode(myCode);
    }
  }
  return output;
}

function decrypt(text, s)
    {
        let result = "";
        s = (26-s) % 26;
        result = encrypt(text, s);
        return result; 
    }
