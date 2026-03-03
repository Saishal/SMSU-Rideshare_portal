# SMSU RideShare 🚗

A ride-sharing platform for SMSU students to coordinate trips safely and easily.

## Tech Stack

- **Backend:** Node.js, Express, MongoDB
- **Frontend:** Static HTML & CSS served from the `public/` folder
- **Security & Middleware:**
  - Helmet
  - CORS
  - express-rate-limit
  - HPP
  - Compression
  - Cookie Parser
  - Morgan (logging)

## Project Structure

```bash
smsu-rideshare-backend/
├─ config/
├─ controllers/
├─ middleware/
├─ models/
├─ routes/
├─ public/
│  ├─ index.html      # Main SMSU RideShare landing page
│  └─ styles.css      # Custom dark, modern UI styling
├─ server.js          # Express app entry point
├─ package.json
├─ .env               # Environment variables (NOT committed)
└─ .gitignore
