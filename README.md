<p align="center">
  <img src="docs/brand/trazo-banner.png" alt="Trazo" width="100%">
</p>

<p align="center">
  <b>Fast, collaborative mobile mockups in the browser.</b><br>
  Build screens from 100+ components, link them into a flow, present them as a prototype,<br>
  and let your team comment on the exact spot — everyone at once, in real time.
</p>

<p align="center"><b>English</b> · <a href="README.es.md">Español</a></p>

<p align="center">
  <a href="LICENSE.md"><img alt="License: PolyForm Noncommercial 1.0.0" src="https://img.shields.io/badge/license-PolyForm%20Noncommercial-0b0b0d"></a>
  <img alt="Languages: FR · ES · EN" src="https://img.shields.io/badge/UI-FR%20%C2%B7%20ES%20%C2%B7%20EN-3b6cf6">
  <img alt="Web, tablet and phone" src="https://img.shields.io/badge/web%20%C2%B7%20tablet%20%C2%B7%20phone-ok-16a37f">
</p>

---

Trazo ("stroke" in Spanish) was built to replace paper in a small team's design sessions. Instead of sketching on a sheet and taking a photo, everyone opens a link on their laptop, tablet or phone, and draws, moves and comments on the same screens at the same time.

![Editor with a four-screen flow, two teammates online and their live cursors](docs/screenshots/03-editor-flujo.png)

## What you can do

**Design fast**
- **115 wireframe components**: system and navigation bars, buttons, forms, lists, cards, charts, maps, commerce (product, cart, checkout, ticket, QR), social (profile, stories, post, notifications, video call), feedback and shapes.
- **15 full-screen templates** in one tap: sign-in, home, product detail, cart, checkout, profile, settings, chat, inbox, map, onboarding, notifications, booking, dashboard and empty state.
- Tap a component to stack it below the last one, or drag it onto any screen. Alignment guides, margin snapping, undo/redo, copy, paste and duplicate.
- **Visual icon picker** (120+ icons): no technical names to remember.
- iPhone, Android, compact and tablet screens, with white, grey or dark backgrounds.
- Two styles: **clean** or **hand-drawn**, so it still feels like paper.

**Link and present**
- Pick an element and set "On tap, go to" a target screen: the canvas draws the flow arrow.
- **Presentation mode**: click through the prototype, ideal for trying it on a phone.

**Collaborate live**
- Conflict-free simultaneous editing (CRDT via [Yjs](https://yjs.dev)): everyone sees changes instantly.
- Named, colored cursors for each person; what others select or drag is shown live.
- Tap someone's avatar to jump to where they are working.
- **Pinned comments** on any point of a screen, with replies and "resolved".

**Share and export**
- Team link (can edit) and **read-only guest link**: guests can view, click through and comment, but cannot change anything (enforced by the server). The link can be revoked and regenerated.
- **PDF export**: one page per screen with numbered comments and the flow's links. PNG export per screen too.

## Screenshots

> The UI is shown in Spanish; Trazo ships in French (default), Spanish and English.

| | |
|---|---|
| ![Sign-in screen with an animated demo](docs/screenshots/01-ingreso.png) | ![Team project list](docs/screenshots/02-proyectos.png) |
| **Sign-in**: team code, your name and your color. | **Team projects**. |
| ![Full-screen templates](docs/screenshots/04-plantillas.png) | ![Visual icon picker](docs/screenshots/05-iconos.png) |
| Ready-to-edit **templates**. | **Icons** picked visually. |
| ![Pinned comment thread](docs/screenshots/06-comentarios.png) | ![Prototype presentation mode](docs/screenshots/07-presentacion.png) |
| **Comments** on the exact spot. | Prototype **presentation**. |
| ![Share dialog](docs/screenshots/08-compartir.png) | ![Hand-drawn style](docs/screenshots/09-estilo-a-mano.png) |
| **Share**: team or read-only. | **Hand-drawn** style. |

<p align="center"><img src="docs/screenshots/10-movil.png" alt="Trazo on a phone" width="320"><br><sub>Works on phones and tablets too: one finger pans, two fingers zoom.</sub></p>

## How it works

```
 Browser (React + Vite)                           Server (Node 24, single process)
 ┌───────────────────────────────┐   WebSocket   ┌──────────────────────────────────────┐
 │ Canvas, palette, inspector    │◄─────────────►│ One Yjs room per project             │
 │ Shared Y.Doc:                 │  sync + pres. │  · broadcasts changes and presence   │
 │  screens · els · comments     │               │  · guests may only write comments    │
 │ Presence: cursor, selection,  │     HTTP      │ API: sign-in, projects, share links  │
 │ live drags                    │◄─────────────►│ SQLite (node:sqlite) in /data        │
 └───────────────────────────────┘               └──────────────────────────────────────┘
```

- **Real time**: each project is a [Yjs](https://yjs.dev) document synced over WebSocket using the `y-websocket` protocol. Presence (cursors, selection, drags) travels through *awareness* and is never stored.
- **Persistence**: the server stores the document state in SQLite (Node's built-in `node:sqlite`, no native dependencies), with a 1.5 s debounced write.
- **Access**: a shared team code creates a signed session (HttpOnly cookie, 180 days). Guest links use a random per-project token; the server checks that guest updates only touch comments and disconnects anyone who tries otherwise.
- **No personal accounts or passwords**: each person types their name and picks a color.

## Getting started

Requires **Node 24** or newer.

```bash
npm install
npm run build
TEAM_CODE=my-code node --disable-warning=ExperimentalWarning server/index.mjs
```

Open `http://localhost:3000` and sign in with `my-code`. For hot reload while developing, keep the server running and in another terminal:

```bash
npm run dev
```

Vite serves `http://localhost:5173` and proxies `/api` and `/ws` to the server.

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `TEAM_CODE` | Code your team types to get in | `trazo` |
| `SECRET` | Signs sessions; use a long random string | random on each start |
| `PORT` | HTTP port | `3000` |
| `DATA_DIR` | Folder for the SQLite database | `./data` |
| `TRAZO_HOST` | Public domain (Docker + Traefik only) | — |

## Deploying with Docker

The `Dockerfile` builds the client and produces a small Node image. `docker-compose.yml` targets a server running **Traefik** (`proxy` network, Let's Encrypt certificates) and keeps data in the `trazo_data` volume.

```bash
# on the server, next to docker-compose.yml
cat > .env <<EOF
TEAM_CODE=a-code-for-your-team
SECRET=$(openssl rand -hex 32)
TRAZO_HOST=trazo.yourdomain.com
EOF
docker compose up -d --build
```

Or from your machine, using an SSH alias for the server:

```bash
DEPLOY_HOST=my-server TRAZO_HOST=trazo.yourdomain.com ./deploy.sh
```

`deploy.sh` uploads the code with `rsync`, creates `.env` on first run (with a random team code) and rebuilds the container over a single shared SSH connection. To view or change the code: `ssh my-server 'cat /opt/trazo/.env'`.

No Traefik? Remove the `labels` and publish the port (`ports: ["3000:3000"]`) behind any HTTPS proxy that supports WebSockets.

## Real-time tests

```bash
npm run test:realtime
```

Starts an isolated instance (port 3999, temporary data) and simulates several people: change latency, convergence of simultaneous edits, live cursors and drags, guest-link permissions, link revocation, reconnection after a server restart, and persistence to disk.

## Languages

French (default), Spanish and English, including component names and their sample content. Strings live in `src/i18n.ts`: the key is the Spanish text and each language has its own dictionary.

## Extending Trazo

- **New component**: add an entry to `LIBRARY` in `src/library.tsx` (type, category, size, default props, editable fields and `render`) plus its `.wf-*` styles in `src/styles.css`. It shows up in the palette, search and inspector automatically.
- **New template**: add a list of `[type, x, y, width, height, props]` to `src/templates.ts` (390 × 844 screen).
- **New icon**: add its SVG path (24 × 24) to `src/icons.tsx`.
- **Translations**: add the Spanish key and its versions in the `en` and `fr` dictionaries of `src/i18n.ts`.

## Project structure

```
server/index.mjs       API, static files and Yjs rooms backed by SQLite
src/main.tsx           routes: sign-in, projects, editor, guest link
src/store.ts           Yjs document, undo, presence and operations
src/library.tsx        component catalog
src/templates.ts       full-screen templates
src/editor/            canvas, palette, inspector, icons, comments, presentation and PDF
src/pages/             sign-in (with animated demo) and projects
src/i18n.ts            FR · ES · EN translations
scripts/               real-time test
docs/                  brand assets and screenshots
```

## Roadmap ideas

- Version history and restoring a previous screen.
- @mentions and notifications for new comments.
- Team component library (save a group as a reusable component).
- Group, align and distribute multiple elements.
- Real image uploads for image placeholders.

## License

Trazo is released under the **[PolyForm Noncommercial License 1.0.0](LICENSE.md)**.

- ✅ You may use, study, modify and share it for **personal use**, learning, research, or within **non-profit** organizations.
- ❌ You may **not** use it for **commercial** purposes (selling it, offering it as a paid service, or using it to run a business) without prior written permission from the author.

Want to use Trazo commercially? Open an issue in this repository or reach out to [@dvxlabs520](https://github.com/dvxlabs520) to discuss a commercial license.

Copyright © 2026 dvxlabs520.
