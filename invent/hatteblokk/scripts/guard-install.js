// Refuse `npm install` inside invent/.
//
// invent/ deliberately has ZERO dependencies. Every package it uses (react, three,
// @react-three/*, vite, typescript) is resolved by walking up to the PARENT repo's
// node_modules. Installing here creates invent/node_modules, which gives us a SECOND
// copy of React and THREE:
//   - two Reacts  -> "invalid hook call" on first render
//   - two THREEs  -> every `instanceof` check fails, the R3F catalogue splits
// The package.json itself must still exist: without it, Vite writes its dep cache into
// the parent's node_modules/.vite (a write outside invent/, and a collision with the
// parent dev server).
console.error(
  '\n  invent/ has no dependencies by design. Do not run npm install here.\n' +
    '  It resolves everything from the parent repo. Run commands from the repo root:\n\n' +
    '    ./node_modules/.bin/vite --config invent/hatteblokk/vite.config.ts\n',
);
process.exit(1);
