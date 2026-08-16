console.error(
  '\n  invent_v1/ has no dependencies by design. Do not run npm install here.\n' +
    '  It resolves react, three, vite and typescript from the parent repo.\n' +
    '  A second copy of React causes "invalid hook call"; a second copy of\n' +
    '  THREE breaks every instanceof and splits the R3F catalogue.\n\n' +
    '    ./node_modules/.bin/vite --config invent_v1/vite.config.ts\n\n' +
    '  The one place npm install IS correct is invent_v1/tools/, which has\n' +
    '  its own isolated toolchain (manifold-3d) and never runs in a browser.\n',
);
process.exit(1);
