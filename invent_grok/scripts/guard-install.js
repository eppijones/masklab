console.error(
  '\n  invent_grok/ has no dependencies by design. Do not run npm install here.\n' +
    '  It resolves react, three, vite and typescript from the parent repo.\n\n' +
    '    ./node_modules/.bin/vite --config invent_grok/vite.config.ts\n',
);
process.exit(1);
