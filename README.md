# Retro Minigames

Nostalgic solo minigames in the browser: Snake, Sudoku, Bounce, 2048, Tetris. No backend, no build step — plain HTML/CSS/ES modules.

## Run locally

```bash
python3 -m http.server
```

Open http://localhost:8000 — ES modules don't load from `file://`, so a server (any static server) is required.

## Deploy

Static files served by Caddy. Block in `../Caddyfile`:

```
minigames.mudaku.my.id {
	root * /home/kusumo/minigames
	file_server
}
```

Then `caddy reload`.

## Add a new game

1. Create `games/<id>.js` exporting the descriptor (`{id, name, icon, blurb, levels, mount(root, options) -> cleanup}`).
2. Add one import and one array entry in `js/app.js`.

Nothing else changes.

## Tests

```bash
node --test test/*.test.js
```
