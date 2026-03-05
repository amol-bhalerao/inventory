# Hostinger Node.js Deployment Setup Guide

This guide walks you through deploying the Solarwala Inventory app on Hostinger.

---

## Step 1: Backend Code Changes ✅ (DONE)

Your backend has been updated to:
- Listen on `process.env.PORT` (Hostinger's auto-assigned port) first
- Fall back to configured port if needed
- Bind to `0.0.0.0` to accept all connections

**Files updated:**
- `backend/src/server.js` - Now uses `process.env.PORT`
- `backend/src/config/app.js` - CORS supports comma-separated origins
- `backend/.env` - Ready for Hostinger with placeholder values

---

## Step 2: Prepare Your Code for Upload

### 1. Update actual secrets in `.env` file

Before uploading, fill in these values in `backend/.env`:

```env
JWT_SECRET=your_32_char_random_secret_here
DB_HOST=your_hostinger_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
```

**To generate a strong JWT_SECRET**, run in terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Build the frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Create a `.gitignore` entry (if using Git deploy)

Make sure `.env` is in `.gitignore` so secrets aren't exposed:
```
backend/.env
node_modules/
*.log
```

---

## Step 3: Configure in Hostinger hPanel

### A. Create/Add Node.js App

1. Log in to **hPanel** → **Websites**
2. Click **Add Website**
3. Select **Node.js Apps** → Choose your deployment method

### B. Set Build & Start Commands

In the **Build Settings** section, configure:

| Setting | Value |
|---------|-------|
| **Node Version** | 20.x (or 18.x, 22.x) |
| **Install Command** | `cd backend && npm install` |
| **Build Command** | `cd frontend && npm install && npm run build && cd ../backend && npm install` |
| **Start Command** | `cd backend && node src/server.js` |
| **Application Path** | `backend/src/server.js` |
| **Public Root** | `frontend/dist` (optional, for static files) |

### C. Set Environment Variables

In **Node.js Apps** → **Environment Variables**, add each variable individually:

```
NODE_ENV                  production
APP_NAME                  Solarwala Inventory
APP_HOST                  0.0.0.0
JWT_SECRET                your_32_char_secret_here
JWT_EXPIRE                7d
JWT_REFRESH_EXPIRE        30d
DB_HOST                   your_database_host
DB_PORT                   3306
DB_USER                   your_database_username
DB_PASSWORD               your_database_password
DB_NAME                   your_database_name
EMAIL_HOST                smtp.gmail.com
EMAIL_PORT                587
EMAIL_USER                your_email@gmail.com
EMAIL_PASSWORD            your_app_password
MAX_FILE_SIZE             5242880
UPLOAD_DIR                ./uploads
CORS_ORIGIN               https://shop.solarwalaa.com,https://shop.hisofttechnology.com
FRONTEND_URL              https://shop.solarwalaa.com
API_URL                   https://shop.solarwalaa.com/api
LOG_LEVEL                 info
LOG_FILE                  ./logs/app.log
```

**⚠️ Important:**
- Do **NOT** include `APP_PORT` - Hostinger sets the `PORT` variable automatically
- `HOST` is also auto-set by Hostinger to `0.0.0.0`

---

## Step 4: Deploy

### Option A: Deploy from Git (Recommended)

1. Push your code to GitHub (with `.env` in `.gitignore`)
2. In hPanel, select **Import Git Repository**
3. Authorize GitHub access
4. Select your repository
5. Confirm build settings (should be auto-detected)
6. Click **Deploy**

### Option B: Upload Files

1. Create a ZIP of your project:
   ```bash
   zip -r solarwala-inventory.zip . -x "node_modules/*" ".git/*" "backend/.env" "frontend/node_modules/*"
   ```
2. In hPanel, select **Upload your website files**
3. Upload the ZIP
4. Confirm build settings
5. Click **Deploy**

---

## Step 5: Verify Deployment

### 1. Check Hostinger Dashboard
- Go to **Node.js Apps** → Your app
- Look for **Last Deployment** status (should show "Success")
- View **Deployment Log** if there are errors

### 2. Test the API

Once deployed, test with curl:

```bash
# Health check
curl https://your-domain.com/health

# API health
curl https://your-domain.com/api/health

# Try login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"123456"}'
```

### 3. Check Browser Console

Open DevTools (F12) → **Network** tab:
- Frontend requests should go to `https://shop.solarwalaa.com/api`
- No localhost requests should appear
- No CORS errors should show

---

## Troubleshooting

### 503 Service Unavailable
- ❌ Backend process didn't start
- ✅ Check **Deployment Log** in hPanel for startup errors
- ✅ Verify database credentials in environment variables
- ✅ Check that `app.listen()` is being called with correct PORT

### CORS Error
- ❌ Frontend domain not allowed
- ✅ Add frontend domain to `CORS_ORIGIN` env var (comma-separated)
- ✅ Restart the app after updating env vars

### 404 on API Routes
- ❌ Wrong start command or app path
- ✅ Verify **Start Command** is `cd backend && node src/server.js`
- ✅ Check **Application Path** is `backend/src/server.js`

### Database Connection Refused
- ❌ Wrong credentials or database host
- ✅ Get correct `DB_HOST` from Hostinger **Databases** section
- ✅ Verify credentials match database user
- ✅ Check if database user has correct permissions

### Logs Location
- Hostinger builds: `/home/{username}/domains/{domain}/nodejs`
- View logs in hPanel: **Node.js Apps** → **Deployments** → **View Log**

---

## After Deployment Checklist

- [ ] Backend starts without errors (check logs)
- [ ] `/health` endpoint responds
- [ ] `/api/health` endpoint responds
- [ ] Database connection works (check in logs)
- [ ] Frontend loads at your domain
- [ ] Login test succeeds (no CORS errors)
- [ ] Network tab shows requests to correct domain
- [ ] All environment variables are set

---

## What If You Need to Redeploy?

1. Make code changes locally
2. Push to GitHub (if using Git deploy)
3. In hPanel → **Node.js Apps** → **Redeploy**
4. Wait for build to complete
5. Check logs for errors

That's it! 🚀

