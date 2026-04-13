# Notes Service

## Run with Docker

From the project root, run:

```bash
docker compose up --build
```

Wait until you see messages like:

```
Server running on port 3000
```

---

## How to open the app

Open in your browser:

Frontend (main app):
http://localhost:8080/pages/login.html

Backend (API test):
http://localhost:3000

---

## How to use

1. Open the frontend link
2. Register
3. Create / edit / delete notes

---

## Requirements

* Docker installed

---

## Alternative (without Docker)

Run backend manually:

```bash
cd backend
npm install
npm start
```

Then open frontend manually:

```
http://localhost:8080/pages/login.html
```
