# ⚙️ VERCEL ENVIRONMENT VARIABLES - SETUP GUIDE

## 🎯 Why Images Fail on Vercel

Your images fail on production (Vercel) because **environment variables are missing**.

The local `.env` file doesn't get deployed to Vercel - you must set them manually.

---

## ✅ Required Environment Variables for Vercel

| Variable | Value | Source | Priority |
|----------|-------|--------|----------|
| `AWS_EVENT_IMAGES_BUCKET` | `event-images-collection` | Your S3 bucket name | 🔴 CRITICAL |
| `AWS_REGION` | `ap-south-1` | Your AWS region | 🔴 CRITICAL |
| `AWS_ACCESS_KEY_ID` | Your AWS access key | AWS IAM | 🔴 CRITICAL |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key | AWS IAM | 🔴 CRITICAL |
| `URL_SECRET` | Random 32+ char string | Generate new | 🟡 IMPORTANT |
| `NODE_ENV` | `production` | Set automatically | ✅ Auto |

---

## 📋 Step-by-Step Setup

### **Step 1: Log into Vercel Dashboard**
1. Go to https://vercel.com
2. Sign in with your GitHub account
3. Find your project

### **Step 2: Navigate to Environment Variables**
1. Click **Settings**
2. Click **Environment Variables** in left sidebar

### **Step 3: Add AWS_EVENT_IMAGES_BUCKET**
```
Name:  AWS_EVENT_IMAGES_BUCKET
Value: event-images-collection
Environments: Production, Preview, Development
```
Then click **Add**

### **Step 4: Add AWS_REGION**
```
Name:  AWS_REGION
Value: ap-south-1
Environments: Production, Preview, Development
```
Then click **Add**

### **Step 5: Add AWS_ACCESS_KEY_ID**
```
Name:  AWS_ACCESS_KEY_ID
Value: [Your AWS Access Key ID]
Environments: Production, Preview, Development
```
Then click **Add**

### **Step 6: Add AWS_SECRET_ACCESS_KEY**
```
Name:  AWS_SECRET_ACCESS_KEY
Value: [Your AWS Secret Access Key]
Environments: Production, Preview, Development
```
Then click **Add**

### **Step 7: Add URL_SECRET (for encryption)**
```
Name:  URL_SECRET
Value: [Generate: openssl rand -base64 32]
Environments: Production, Preview, Development
```
Then click **Add**

### **Step 8: Redeploy**
After adding these variables:
1. Go to **Deployments** tab
2. Click the three dots on latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

---

## 🔑 Getting AWS Credentials

### **Find AWS Access Key**
1. Go to AWS Console → IAM → Users
2. Click your username
3. Go to **Security credentials** tab
4. Under **Access keys**, create a new key
5. Copy both **Access Key ID** and **Secret Access Key**

### **Check IAM Permissions**
Ensure your IAM user has S3 access:
1. AWS Console → IAM → Users
2. Click the user
3. Click **Add permission** → **Attach policies directly**
4. Search for `AmazonS3FullAccess`
5. Select and click **Add permission**

---

## 🧪 Verify It Works

### **After Redeployment**

**Check 1: Health Check**
```bash
curl https://yourapp.vercel.app/api/images/health
```
Should return `200` with `{"status":"success"}`

**Check 2: Get Events**
```bash
curl https://yourapp.vercel.app/api/events?limit=1
```
Should return events with `coverImageUrl`

**Check 3: Get Image**
```bash
curl https://yourapp.vercel.app/api/images/public/events/YOUR_EVENT_ID/cover.jpeg
```
Should return the image (JPEG data)

**Check 4: Check S3 URL is Correct**
```bash
# In browser, visit:
https://event-images-collection.s3.ap-south-1.amazonaws.com/events/YOUR_EVENT_ID/cover.jpeg
```
Should show the image

---

## 🐛 Troubleshooting

### **❌ Still getting 500 error**

**Check logs:**
1. Vercel Dashboard → Deployments
2. Click latest deployment
3. Click **Function Logs**
4. Look for error messages

**Common errors:**

| Error | Fix |
|-------|-----|
| `Failed to fetch image` | S3 bucket name or region wrong |
| `403 Forbidden` | AWS credentials invalid or missing S3 permission |
| `404 Not Found` | Event/image doesn't exist in S3 |
| `ECONNREFUSED` | Cannot connect to S3 (network/firewall issue) |

### **❌ Image URL is wrong**

Check that:
- S3 bucket name matches: `event-images-collection`
- Region matches: `ap-south-1`
- S3 key format: `events/{eventId}/cover.jpeg`

### **❌ Env vars not applied**

1. Clear Vercel cache:
   - Delete node_modules: `rm -rf node_modules`
   - Delete .vercel folder: `rm -rf .vercel`
   
2. Force redeploy:
   - Vercel Dashboard → Deployments → Redeploy latest

3. Verify vars are set:
   - Vercel Dashboard → Settings → Environment Variables
   - Check all 5 variables are listed

---

## 📊 .env vs Vercel Env Vars

| Location | Local Dev | Production |
|----------|-----------|------------|
| `.env` file | ✅ Loaded automatically | ❌ Not deployed |
| Vercel Dashboard | ❌ Not used locally | ✅ Loaded on deployment |
| System environment | ✅ Works if set | ✅ Works if set |

**Local Development:**
```bash
# Create .env file
AWS_EVENT_IMAGES_BUCKET=event-images-collection
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
URL_SECRET=your_secret_key

# Run locally
npm start  # or node server.js
```

**Production (Vercel):**
```
Use Vercel Dashboard → Settings → Environment Variables
(Same 5 variables, entered manually in dashboard)
```

---

## 🎯 Sample Environment Variables

```
AWS_EVENT_IMAGES_BUCKET=event-images-collection
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
URL_SECRET=q5s8v3k2j9p1m4n7x2c5z8b3v6j9
```

---

## ✅ Checklist Before Deploy

- [ ] AWS credentials obtained from IAM
- [ ] S3 bucket is `event-images-collection`
- [ ] S3 region is `ap-south-1`
- [ ] IAM user has S3 permissions
- [ ] All 5 env vars added to Vercel
- [ ] Latest deployment triggered
- [ ] Deployment completed successfully
- [ ] Health check passes
- [ ] Images load in Postman
- [ ] Images display in browser

---

## 🚀 Quick Setup Script

If you have Vercel CLI installed:

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Set environment variables
vercel env add AWS_EVENT_IMAGES_BUCKET event-images-collection
vercel env add AWS_REGION ap-south-1
vercel env add AWS_ACCESS_KEY_ID your_key
vercel env add AWS_SECRET_ACCESS_KEY your_secret
vercel env add URL_SECRET $(openssl rand -base64 32)

# Redeploy
vercel --prod
```

---

## 📞 Common Issues

### **Issue: "Cannot find module 'axios'"**
- AWS SDK not installed
- Run: `npm install axios`
- Commit and redeploy

### **Issue: Images work locally but not on Vercel**
- 99% of the time: **Missing environment variables**
- Check Vercel Dashboard → Settings → Environment Variables
- All 5 variables must be set

### **Issue: Variables set but still failing**
- Clear cache: Delete `.vercel` folder
- Redeploy: Vercel Dashboard → Redeploy
- Wait 2-3 minutes for new build

---

## 🎓 What's Happening

```
Local Development:
┌──────────────┐
│ .env file    │  ← Node reads automatically
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ app running  │  ← process.env.AWS_EVENT_IMAGES_BUCKET available
└──────────────┘

Production (Vercel):
┌──────────────────────────┐
│ Vercel Dashboard         │  ← You set here
│ Environment Variables    │
└──────┬───────────────────┘
       │
       ↓
┌──────────────────────────┐
│ Deployment Build Process │  ← Variables injected
└──────┬───────────────────┘
       │
       ↓
┌──────────────┐
│ app deployed │  ← process.env.AWS_EVENT_IMAGES_BUCKET available
└──────────────┘
```

---

## 🔐 Security Best Practices

✅ **DO:**
- Use Vercel environment variables (not hardcoded)
- Keep AWS keys secret
- Rotate access keys regularly
- Use IAM users (not root account)
- Grant minimum required permissions

❌ **DON'T:**
- Commit .env to Git
- Expose AWS keys in code/logs
- Use root AWS account credentials
- Grant S3-FullAccess if not needed

---

## 📖 Next Steps

1. **Set up environment variables** following steps above
2. **Redeploy on Vercel**
3. **Test with curl** from troubleshooting section
4. **Run diagnostic script**: `node diagnoseImageIssue.js`
5. **Check logs** if still not working

**Questions?** See: [IMAGE_RETRIEVAL_GUIDE.md](IMAGE_RETRIEVAL_GUIDE.md)
