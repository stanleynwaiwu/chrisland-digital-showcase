/**
 * Interactive admin-account creation. Run by hand, once, on the
 * school computer:
 *
 *   npm run create-admin
 *
 * Prompts for a username and password on stdin — nothing
 * resembling a password ever appears in source control. Can be
 * run again later to add another staff login; refuses to
 * overwrite an existing username.
 *
 * Note: the password prompt is not masked as you type (a plain
 * readline limitation) — acceptable for a one-time setup step run
 * locally by school staff, not exposed over a network.
 *
 * Implementation note: this uses readline's line-by-line event
 * (not the question()-callback chaining pattern) to collect the
 * three answers in sequence — more robust across both interactive
 * TTY use and piped/scripted input.
 */
const readline = require('readline');
const db = require('../db/database');
const { hashPassword } = require('../lib/passwords');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

const STEPS = ['username', 'password', 'confirm'];
let stepIndex = 0;
const answers = {};

console.log('Chrisland Experience — create an admin account\n');
process.stdout.write('Username: ');

rl.on('line', (line) => {
  const step = STEPS[stepIndex];
  answers[step] = line;
  stepIndex += 1;

  if (step === 'username') {
    if (!answers.username.trim()) {
      console.error('Username cannot be empty.');
      rl.close();
      process.exitCode = 1;
      return;
    }
    const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(answers.username.trim());
    if (existing) {
      console.error(`An account named "${answers.username.trim()}" already exists.`);
      rl.close();
      process.exitCode = 1;
      return;
    }
    process.stdout.write('Password (min 8 characters): ');
    return;
  }

  if (step === 'password') {
    if (answers.password.length < 8) {
      console.error('Password must be at least 8 characters.');
      rl.close();
      process.exitCode = 1;
      return;
    }
    process.stdout.write('Confirm password: ');
    return;
  }

  if (step === 'confirm') {
    rl.close();
    if (answers.password !== answers.confirm) {
      console.error('Passwords do not match.');
      process.exitCode = 1;
      return;
    }

    hashPassword(answers.password)
      .then((passwordHash) => {
        db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(
          answers.username.trim(),
          passwordHash
        );
        console.log(`\nAdmin account "${answers.username.trim()}" created.`);
      })
      .catch((err) => {
        console.error('\ncreate-admin failed:', err);
        process.exitCode = 1;
      });
  }
});

rl.on('close', () => {
  // Give the async hashPassword().then() above a chance to finish
  // and set process.exitCode before Node would otherwise exit once
  // stdin closes with no more listeners.
});
