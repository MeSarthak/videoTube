# VideoTube Frontend - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open Your Browser
Navigate to: http://localhost:5173

That's it! You're ready to start using VideoTube.

## 📋 What's Included

### Pages
1. **Home** (`/`) - Browse all videos
2. **Login** (`/login`) - User authentication
3. **Register** (`/register`) - Create new account
4. **Watch** (`/watch/:id`) - Video player with HLS streaming
5. **Channel** (`/channel/:username`) - User channel profile
6. **Upload** (`/upload`) - Upload new videos (requires login)
7. **Watch History** (`/watch-history`) - Your viewing history (requires login)
8. **Settings** (`/settings`) - Account settings (requires login)

### Features Working Out of the Box
- ✅ User Registration with avatar/cover upload
- ✅ Login with automatic token management
- ✅ Video browsing on home page
- ✅ HLS video playback with adaptive quality
- ✅ Video upload with progress tracking
- ✅ User profiles and channels
- ✅ Watch history tracking
- ✅ Account settings management
- ✅ Protected routes for authenticated users
- ✅ Responsive mobile design
- ✅ Error boundaries and toast notifications

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start dev server at localhost:5173

# Production Build
npm run build        # Build for production
npm run preview      # Preview production build

# Linting
npm run lint         # Run ESLint
```

## 🎯 Testing the Application

### 1. Register a New Account
1. Click "Sign Up" in the header
2. Fill in: username, full name, email, password
3. Optionally upload avatar and cover image
4. Click "Create Account"
5. You'll be automatically logged in

### 2. Upload a Video
1. Click "Upload" button in header
2. Select a video file (MP4, WebM, or OGG)
3. Add title and description
4. Click "Upload Video"
5. Watch upload progress
6. Redirected to video player when complete

### 3. Watch Videos
1. Click any video card on home page
2. Video player will load with HLS streaming
3. Use controls for play/pause, seek, volume, fullscreen

### 4. Manage Your Profile
1. Click your avatar in header
2. Go to "Settings"
3. Update account details
4. Change password
5. Update avatar/cover image

## 🌐 API Backend

The frontend is configured to connect to:
```
https://backend-project-5bs5.onrender.com/api/v1
```

All API endpoints are defined in `src/config/constants.js`

## 📱 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## 🔍 Troubleshooting

### Issue: Videos not loading
**Solution:** Check if backend API is accessible at the configured URL

### Issue: Upload fails
**Solution:** 
- Check file size (max 500MB)
- Check file format (MP4, WebM, OGG only)
- Ensure you're logged in

### Issue: Token expired errors
**Solution:** The app should auto-refresh tokens. Try logging out and back in.

### Issue: Build warnings about chunk size
**Solution:** This is expected due to HLS.js library. Can be optimized with dynamic imports if needed.

## 📚 Project Structure Overview

```
src/
├── components/
│   ├── common/          # Button, Input, Modal, Card, etc.
│   ├── layout/          # Header, Layout, ProtectedRoute
│   └── video/           # VideoCard, VideoPlayer, VideoGrid
├── pages/               # All page components
├── services/            # API services (auth, user, video)
├── hooks/               # Custom hooks (useVideo, useUser)
├── contexts/            # AuthContext for state management
├── utils/               # Helper functions
└── config/              # Configuration constants
```

## 🎨 Key Technologies

- **React 19** - UI library
- **Vite** - Build tool
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **SWR** - Data fetching
- **Axios** - HTTP client
- **HLS.js** - Video streaming
- **React Hot Toast** - Notifications

## 🔐 Authentication Notes

- JWT tokens stored in localStorage
- Automatic token refresh on expiry
- Protected routes redirect to login
- Session persists across page reloads

## 🚀 Performance Features

Following Vercel React Best Practices:
- SWR for automatic request deduplication
- React.memo for component optimization
- Lazy loading for images
- Content visibility for lists
- Direct imports to reduce bundle size

## 📖 Learn More

- Full documentation: `VIDEOTUBE_README.md`
- API documentation: `documentation.md`
- Best practices: `skills/vercel-react-best-practices/`

## 💡 Tips

1. **First Time Setup:** Create an account to access all features
2. **Video Upload:** Works best with videos under 100MB for faster processing
3. **Performance:** Clear browser cache if you experience issues
4. **Mobile:** Fully responsive, test on mobile devices

## 🎉 You're All Set!

The VideoTube frontend is now ready to use. Start by:
1. Creating an account
2. Uploading your first video
3. Exploring other users' channels
4. Customizing your profile

Happy streaming! 🎬
