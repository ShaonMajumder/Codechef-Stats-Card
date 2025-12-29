# CodeChef Stats Card

Generate a clean, shareable SVG card for any public CodeChef profile. The project includes a Vite + React UI for previewing the card and a lightweight Express API that scrapes the CodeChef profile page and renders the SVG server-side.

---

## Features

- **Instant SVG preview** - Enter a handle, validate the profile, and view the card inline.
- **Share-ready embeds** - Copy Markdown, HTML, and raw URL snippets with one click.
- **Profile scraping** - Pulls display name, country, solved count, and badge count from the public profile HTML.
- **Serverless-friendly API** - A single Express app exposes `/api/codechef-card`, with CORS and cache headers.

---

## Project Structure

```
codechef-stats-card/
|-- src/
|   `-- pages/Index.tsx      # UI for generating cards
|-- server/
|   |-- app.js               # Express app shared by dev server + Netlify
|   `-- index.js             # Local dev entry (nodemon)
|-- netlify/
|   `-- functions/
|       `-- codechef-card.js # serverless-http wrapper
|-- netlify.toml             # Build + redirect configuration
|-- package.json
`-- README.md
```

---

## Getting Started

### 1. Prerequisites

- Node.js **18+**
- npm **10+**

### 2. Installation

```bash
git clone <your-repo-url>
cd codechef-stats-card
npm install
```

### 3. Environment Variables

Create `.env` (already gitignored):

```bash
VITE_API_BASE_URL=""
```

- Leave empty to call the API on the same origin (default for local dev and Netlify).
- Set to `https://your-api.example.com` if you deploy the Express server elsewhere.

### 4. Run locally

```bash
npm run dev
```

This runs:

- Vite dev server on [http://localhost:8080](http://localhost:8080)
- Nodemon + Express API on [http://localhost:8787](http://localhost:8787)

---

## API Reference

### `GET /api/codechef-card`

| Query param | Type   | Required | Description               |
| ----------- | ------ | -------- | ------------------------- |
| `username`  | string | Yes      | CodeChef handle to fetch. |

**Responses**

- `200 OK` - SVG string (includes `Cache-Control: public, max-age=3600`).
- `400 Bad Request` - `{ error: "Username is required" }`.
- `404 Not Found` - `{ error: "Profile not found" }`.
- `500 Internal Server Error` - `{ error: "Internal server error" }`.

---

## Deployment (Netlify)

1. Connect the repository in Netlify.
2. Netlify reads `netlify.toml` and automatically:
   - Runs `npm run build`.
   - Publishes the client from `dist/`.
   - Bundles functions from `netlify/functions/`.
3. `/api/*` routes are redirected to `/.netlify/functions/codechef-card`, which runs the Express logic via `serverless-http`.

---

## Notes

- CodeChef does not expose a documented public API, so the server scrapes the profile HTML.
- If CodeChef changes the HTML structure, update the selectors in `server/app.js`.

---

## Author & Credits

**Built and maintained by [Shaon Majumder](https://shaonresume.netlify.app)**  
Senior Software Engineer - AI & Scalability

**Connect**

- Portfolio: https://shaonresume.netlify.app
- GitHub: https://github.com/ShaonMajumder
- LinkedIn: https://www.linkedin.com/in/shaonmajumder
- Medium: https://medium.com/@shaonmajumder
- Resume: https://shaonresume.netlify.app/resume.html

---

Happy coding! Feel free to open an issue or PR if you build something cool with the HackerRank Stats Card.
