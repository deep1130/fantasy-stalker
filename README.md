# 🎯 Fantasy Stalker

**Fantasy Stalker** is a competitive intelligence tool for Sleeper fantasy football managers. Scout your league mates' draft habits, tendencies, positional biases, and historical picks across all their past leagues and drafts to give you a strategic edge during fantasy draft season.

![Fantasy Stalker Preview](https://github.com/user-attachments/assets/sample-preview.png)

## ✨ Features

- **🔍 Sleeper Username Infiltration:** Search any Sleeper manager to discover all their active and historical leagues (2024, 2023, 2022).
- **🎯 Opponent Scouting Dossier:**
  - **Draft DNA Badges:** Automatically identifies archetypes like *Bellcow Hoarder*, *Air Raid Strategist*, *Early QB Hunter*, *Elite TE Chaser*, and *Rookie Gambler*.
  - **Positional Distribution:** Visual allocation percentages across RB, WR, QB, TE, K, and DEF.
  - **Early Round Tendencies (Rounds 1–3):** Highlights what positions and players an opponent targets when the stakes are highest.
  - **NFL Franchise Bias:** Pinpoints loyalty to specific NFL teams.
  - **Draft Crushes & Repeat Targets:** Uncovers players the manager has drafted multiple times across different leagues.
  - **Tactical Exploitation Intel:** Actionable counter-strategies on how to beat them on draft day.
- **📊 Full Interactive Draft Board Grid:** View the entire multi-round draft board of any league draft, with the target opponent highlighted.
- **⚡ Zero Configuration / Free Public Sleeper API:** Powered directly by Sleeper's public CORS-friendly REST endpoints—no API key required.
- **🚀 Automated GitHub Actions Deployment:** Out-of-the-box CI/CD workflow deploying static builds to GitHub Pages.

## 🛠️ Tech Stack

- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + custom dark tactical theme
- **Icons:** Lucide React
- **Package Manager:** pnpm
- **CI/CD:** GitHub Actions (`.github/workflows/deploy.yml`)

## 💻 Local Development

1. Clone repository and install dependencies:
```bash
git clone https://github.com/<your-username>/fantasy-stalker.git
cd fantasy-stalker
pnpm install
```

2. Start the development server:
```bash
pnpm dev
```

3. Build for production:
```bash
pnpm build
```

## 🚀 GitHub Actions Deployment to GitHub Pages

The repository includes `.github/workflows/deploy.yml`. When you push to `main`:
1. Go to your repository on GitHub.
2. Navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Push to `main` and the site will be automatically deployed!
