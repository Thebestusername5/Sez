# SEAZURE 3D

Seazure is a kid-friendly 3D 5v5 attack/defend browser prototype.

## Included
- First-person 3D browser gameplay using Three.js
- 5v5 room/lobby multiplayer foundation
- 6 original attacker classes
- 6 original defender classes
- Crayon projectiles
- Confetti elimination effect
- Objective site
- Reinforced/destructible wall prototype
- Preparation and action phases
- Match settings
- Score/round system foundation
- Render deployment configuration

## Run
Requires Node.js 20+.

```bash
cd server
npm install
npm start
```

Then open http://localhost:3000

Three.js is loaded from a CDN in `client/index.html`.

## Deploy to Render
Push the folder to GitHub, then create a Render Web Service. The root `render.yaml` is configured for the Node server.

## Controls
WASD = move
Mouse = look
Left click = fire crayon
R = reload
E = interact/objective
Shift = sprint
1-6 = select class

The project is an original game and does not include proprietary game assets or code.
