<div align="center">

# 🃏 Planning Poker – Agile Estimation App

Collaborative, real‑time planning poker for agile teams.

🌐 **Live site:** https://planning-poker.xyz

</div>

---

## ✨ Features

- 🔐 Login & user badge with avatar
- 👥 Real‑time multiplayer lobbies
- 🃏 Multiple card decks (Fibonacci, T‑shirt sizes, etc.)
- 📊 Vote statistics and reveal countdown
- 📋 Issues sidebar with current issue banner
- 🌍 Multi‑language support

---

## 🚀 Tech Stack

- ⚙️ **Framework:** Angular 20 (standalone components)
- 🎨 **Styling:** CSS with a custom dark theme
- 🔌 **Realtime:** WebSocket based `SocketService`
- 🌐 **Hosting target:** Static site hosting / SPA hosting

---

## 🧑‍💻 Local Development

```bash
npm install
npm start
```

Then open: http://localhost:4200

---

## 🏗️ Production Build

```bash
npm run build
```

The optimized build will be generated in `dist/`.

You can serve it with any static HTTP server, for example:

```bash
npm install -g http-server
http-server dist/spades -p 8080
```

Then open: http://localhost:8080

---

## ☁️ Hosting & SSO Requirements

To host **planning-poker.xyz**, you basically need:

1. 🌍 **A domain name** – e.g. `planning-poker.xyz` bought from any registrar.
2. 📦 **A hosting provider** – Netlify, Vercel, GitHub Pages, Azure Static Web Apps, Nginx on a VPS, etc.
3. 📁 **The production build** – contents of the `dist/` folder created by `npm run build`.
4. 🔁 **SPA routing support** – configure your host so all unknown routes serve `index.html`.
5. 🔒 **HTTPS** – usually automatic via your hosting provider (Let’s Encrypt / built‑in SSL).
6. 🧩 **SSO server (Keycloak)** – a running Keycloak instance with:
	- a realm called `planning-poker` (or update `authRealm` in `src/environments`),
	- a public client named `frontend-service` (or update `authClient`),
	- valid redirect URIs for `https://planning-poker.xyz/*`.

By default the app expects Keycloak at **https://auth.planning-poker.xyz** (see `authUrl` in the environment files). If you host Keycloak somewhere else, just adjust the values in `src/environments/environment.ts` and `src/environments/environment.prod.ts`.

---

## 🧪 Testing

```bash
npm test
```

Runs the unit tests.

---

## 📄 License

This project is for personal/educational use. Adapt it as needed for your own teams and hosting setup.
