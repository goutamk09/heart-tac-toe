# Heart Tac Toe

A production-ready multiplayer Tic-Tac-Toe game built with a React frontend and Nakama backend using a server-authoritative architecture.

---

## Live Demo

Frontend: https://hearttactoe.site  
Backend Endpoint: https://hearttactoe.site  

---

## Source Code

GitHub Repository: https://github.com/goutamk09/heart-tac-toe  

---

## Tech Stack

Frontend:
- React
- TypeScript
- Vite

Backend:
- Nakama (Authoritative Multiplayer Server)
- PostgreSQL
- Docker & Docker Compose
- Nginx
- Certbot (HTTPS)

---

## Features

Core:
- Server-authoritative game logic
- Server-side move validation
- Real-time multiplayer sync
- Turn-based gameplay enforcement
- Win and draw detection
- Room creation
- Room joining via ID
- Graceful disconnect handling
- HTTPS deployment

Bonus:
- Turn timer
- Rematch functionality
- Score tracking UI
- Concurrent matches support
- Mobile responsive UI

---

## Architecture

The frontend (React) sends player actions like join, move, and rematch.

Nakama server:
- controls full game state
- validates moves
- enforces turns
- detects win/draw
- broadcasts updates

Nginx:
- serves frontend
- proxies API (/v2)
- proxies WebSocket (/ws)

---

## Project Structure

heart-tac-toe/
- frontend/ (React app)
- backend/nakama/ (Nakama + match logic)
- docker-compose.yml
- README.md

---

## Setup and Installation

Prerequisites:
- Node.js
- npm
- Docker
- Docker Compose

Backend Setup (Local):
cd backend/nakama  
npm install  
npm run build  
docker-compose up -d  

Frontend Setup (Local):
cd frontend  
npm install  
npm run dev  

Local Environment (frontend/.env.local):
VITE_NAKAMA_HOST=127.0.0.1  
VITE_NAKAMA_PORT=7350  
VITE_NAKAMA_SSL=false  

---

## Production Configuration

frontend/.env.production:
VITE_NAKAMA_HOST=hearttactoe.site  
VITE_NAKAMA_PORT=443  
VITE_NAKAMA_SSL=true  

---

## Deployment

Backend (DigitalOcean):
cd ~/heart-tac-toe/backend/nakama  
docker-compose up -d  

Frontend:
cd ~/heart-tac-toe  
git pull  
cd frontend  
npm install  
npm run build  
cp -r dist/. /var/www/html/  
systemctl restart nginx  

HTTPS:
Configured using Certbot (Let's Encrypt)

---

## Server Configuration

- Nakama runs on port 7350 internally
- PostgreSQL via Docker
- Nginx routes:
  /v2 → Nakama API  
  /ws → Nakama WebSocket  
- Public access via HTTPS domain

---

## Testing Multiplayer

1. Open https://hearttactoe.site in two browsers/devices  
2. Enter different names  
3. Player 1 creates room  
4. Player 2 joins  
5. Play full game  
6. Verify:
   - sync works  
   - turn works  
   - win/draw works  
   - rematch works  
7. Close one tab → check disconnect handling  

---

## Known Limitations

- Same browser session may reuse previous identity
- Quick matchmaking can be improved
- Global persistent leaderboard can be extended

---

## Summary

This project demonstrates:

- Server-authoritative multiplayer system
- Real-time gameplay
- Nakama backend integration
- Cloud deployment with HTTPS
- Full multiplayer lifecycle implementation