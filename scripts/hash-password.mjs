import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { stdin, stdout, stderr } from 'node:process';

stdout.write('Admin password: ');
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding('utf8');

let password = '';
stdin.on('data', (char) => {
  if (char === '\u0003') process.exit(130);
  if (char === '\r' || char === '\n') {
    stdin.setRawMode(false);
    stdout.write('\n');
    if (!password) {
      stderr.write('Password is required.\n');
      process.exit(1);
    }
    const iterations = 210000;
    const salt = randomBytes(16).toString('base64url');
    const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
    stdout.write('ADMIN_PASSWORD_HASH=pbkdf2:' + iterations + ':' + salt + ':' + hash + '\n');
    process.exit(0);
  }
  if (char === '\u007f') password = password.slice(0, -1);
  else password += char;
});
