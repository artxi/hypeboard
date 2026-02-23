# HypeBoard 🎉

A real-time collaborative soundboard application for streaming and content creation.

This is currently a **Hello World deployment test** to validate the hosting infrastructure before building the full application.

## Project Structure

```
hypeboard/
├── packages/
│   ├── backend/          # NestJS API
│   └── frontend/         # Vite + React
├── package.json          # Root workspace config
└── pnpm-workspace.yaml   # pnpm workspace definition
```

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Backend**: NestJS (Node.js framework)
- **Frontend**: React + TypeScript + Vite
- **Backend Hosting**: Render.com (Free tier)
- **Frontend Hosting**: Vercel (Free tier)

## Prerequisites

- Node.js 18+
- pnpm 8+

Install pnpm if you don't have it:
```bash
npm install -g pnpm
```

## Local Development Setup

### 1. Install Dependencies

From the root directory:

```bash
pnpm install
```

This will install dependencies for all packages in the monorepo.

### 2. Configure Environment Variables

Create a `.env.local` file in `packages/frontend/`:

```bash
cd packages/frontend
cp .env.example .env.local
```

The default values are already set for local development:
```
VITE_API_URL=http://localhost:3000
```

### 3. Run the Application

You need two terminal windows:

**Terminal 1 - Backend:**
```bash
pnpm dev:backend
```
Backend will run on `http://localhost:3000`

**Terminal 2 - Frontend:**
```bash
pnpm dev:frontend
```
Frontend will run on `http://localhost:5173`

### 4. Test Locally

Open your browser to `http://localhost:5173`

You should see:
- ✅ "Hello World - HypeBoard" heading
- ✅ Data fetched from the backend API
- ✅ Health status and timestamp displayed

## API Endpoints

### Backend (`http://localhost:3000`)

- `GET /` - Returns welcome message and version
- `GET /health` - Returns health status, timestamp, and uptime

Test with curl:
```bash
curl http://localhost:3000/health
```

## Deployment

### Backend Deployment - Render.com

1. **Create Account**: Sign up at [render.com](https://render.com)

2. **Create Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `hypeboard-backend`
     - **Region**: Choose closest to you
     - **Branch**: `main`
     - **Root Directory**: `packages/backend`
     - **Runtime**: Node
     - **Build Command**: `pnpm install && pnpm --filter backend build`
     - **Start Command**: `node dist/main.js`
     - **Plan**: Free

3. **Deploy**: Click "Create Web Service"

4. **Note the URL**: Render will assign a URL like:
   ```
   https://hypeboard-backend.onrender.com
   ```
   You'll need this for the frontend deployment.

**Important Notes:**
- Free tier spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds (cold start)
- Sufficient for testing and low-traffic apps

### Frontend Deployment - Vercel

1. **Create Account**: Sign up at [vercel.com](https://vercel.com)

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Root Directory**: `packages/frontend`
     - **Build Command**: `cd ../.. && pnpm install && pnpm --filter frontend build`
     - **Output Directory**: `dist`
     - **Install Command**: `pnpm install`

3. **Set Environment Variables**:
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL = https://hypeboard-backend.onrender.com
     ```
     (Use your actual Render backend URL from step above)

4. **Deploy**: Vercel will automatically deploy

5. **Note the URL**: Vercel assigns a URL like:
   ```
   https://hypeboard.vercel.app
   ```

**Important Notes:**
- Vercel auto-deploys on every git push to main
- Preview deployments created for pull requests
- Free tier includes generous bandwidth and build minutes

## Verification Checklist

After deploying both services:

- [ ] Visit your Vercel URL
- [ ] Page loads with "Hello World" heading
- [ ] Backend data is fetched and displayed
- [ ] No CORS errors in browser console
- [ ] Health status shows "ok" and a timestamp
- [ ] Test cold start: Wait 20 minutes, then refresh (should work after ~30s delay)

## Build Commands

From the root directory:

```bash
# Build both packages
pnpm build:all

# Build backend only
pnpm build:backend

# Build frontend only
pnpm build:frontend
```

## Project Status

✅ **Phase 1: Hello World Deployment Test** (Current)
- Basic monorepo structure
- Minimal NestJS backend
- Minimal React frontend
- Deployed to Render + Vercel
- CORS configured
- Frontend-backend communication tested

🚧 **Phase 2: Full MVP** (Next)
- User authentication
- Real-time WebSocket communication
- Sound upload and storage
- Room management
- MongoDB integration
- Full soundboard features

## Troubleshooting

### Frontend can't connect to backend locally

- Ensure backend is running on port 3000
- Check `.env.local` has correct `VITE_API_URL`
- Restart frontend dev server after changing env vars

### CORS errors in production

- Verify backend CORS is enabled in `main.ts`
- Check that frontend is using correct backend URL
- Verify environment variable is set in Vercel

### Backend cold start takes long

- This is expected on Render free tier
- Backend spins down after 15 minutes of inactivity
- First request wakes it up (~30 seconds)
- Consider paid tier for always-on instances

### Build fails on Render

- Check build logs in Render dashboard
- Verify `pnpm-lock.yaml` is committed to git
- Ensure all dependencies are in `package.json`

### Build fails on Vercel

- Check build logs in Vercel dashboard
- Verify root directory is set to `packages/frontend`
- Ensure environment variables are set correctly

## Learn More

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)

## License

MIT
