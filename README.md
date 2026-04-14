# Notes Service

A simple notes application with:
- Express + SQLite backend
- static HTML/CSS/JS frontend
- Docker support
- local run support

## Run with Docker

From the project root, run:

```bash
docker compose up --build
```

Open the app at:

```
http://localhost:8080/pages/login.html
```

The backend API is available at:

```
http://localhost:3000/api
```

### How Docker storage works

The SQLite database file is stored in `backend/notes.db`.
In Docker Compose, the whole `backend` folder is mounted into the container, so data stays in that file on your computer and is not lost when containers are restarted.

---

## Run locally

### 1. Start the backend

```bash
cd backend
npm install
npm start
```

You should see:

```
Server running on port 3000
```

### 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm start
```

Open the app at:

```
http://localhost:8081/pages/login.html
```

For local run, the frontend talks directly to `http://localhost:3000/api`.
For Docker run, the frontend uses the nginx proxy at `/api`.

---

## Lint check

From the `frontend` folder:

```bash
npm run lint
```

---

## Project structure

```
backend/   Express API + SQLite database
frontend/  Static pages, styles and JavaScript
```
