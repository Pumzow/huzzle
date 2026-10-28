# SoundTool integration

Huzzle's sound behavior is defined by `app/config/soundGraph.json`. The graph connects Huzzle event names to sound files, random branches, pitch ranges, channels, loops, and stop actions.

## Edit game sounds

1. Start SoundTool with `bun run dev` in the private SoundTool repository.
2. Import `app/config/soundGraph.json` into the SoundTool editor.
3. Edit and preview the graph.
4. Export it and replace `app/config/soundGraph.json` with the exported file.
5. Run `bun test` and `bun run build` in Huzzle.

Sound files referenced by the graph remain under `public/sounds`. Event-node names must match the values in `app/types/eventTypes.ts`.

## Update the engine

Run `bun run soundtool:update` or use **Update SoundTool** in Huzzle Toolbox. The updater downloads the latest private `vX.Y.Z` tag, packages it into `vendor`, updates `package.json` and `bun.lock`, and validates the game.

`bun run dev` checks both SoundTool and Huzzle Rules tags before Vite starts. The check is informational and does not update dependencies automatically.
