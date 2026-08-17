console.error(
  '\n  invent/heklo/ has no dependencies by design. Do not run npm install here.\n' +
    '  It resolves react, three, vite and typescript from the parent repo.\n\n' +
    '    ./node_modules/.bin/vite --config invent/heklo/vite.config.ts\n',
);
process.exit(1);
