# Development Mode Guide

## What's Fixed

The application now has **automatic fallback to demo/mock data** when the backend API is unavailable. This means:

✅ **No more network errors** - Videos load from demo data
✅ **Smooth development experience** - Works offline
✅ **Auto-retry logic** - Retries failed requests with exponential backoff
✅ **Better error messages** - Shows helpful info in UI

---

## Running VideoTube

### Development Mode (with Demo Data)

```bash
npm run dev
```

Then open: http://localhost:5173

**What works:**
- ✅ Browse demo videos on home page
- ✅ Watch videos with HLS streaming (demo videos from Unified Streaming)
- ✅ View channel profiles
- ✅ All UI/UX interactions
- ✅ Navigation and routing

**What needs backend:**
- ⚠️ User registration/login (uses real auth)
- ⚠️ Video upload (uses real API)
- ⚠️ Account settings

---

## Connecting to Real Backend

When your backend is ready:

1. Make sure backend is running at: `https://backend-project-5bs5.onrender.com/api/v1`

2. The app will automatically try the backend first

3. If backend responds, it will use real data

4. If backend fails, it falls back to demo data

---

## Demo Videos Included

8 beautiful demo videos with:
- Real video thumbnails from Unsplash
- HLS streaming from Unified Streaming
- Mock user profiles
- Realistic metadata

Videos include:
1. React 19 fundamentals
2. TypeScript patterns
3. Web performance
4. Tailwind CSS
5. Node.js best practices
6. Database design
7. Docker & Kubernetes
8. GraphQL API design

---

## How the Fallback Works

```
API Request
    ↓
Try Backend (Real)
    ↓
❌ Backend Fails?
    ↓
✅ Use Mock Data (Development)
```

**Retry Logic:**
- Automatic retries for network errors
- Exponential backoff (1s, 2s, 3s)
- Max 3 retries per request

---

## Testing the Demo

### Test 1: Browse Videos
1. Open http://localhost:5173
2. See 8 demo videos on home page
3. Click any video to watch

### Test 2: Watch Video
1. Click a video card
2. HLS video player loads
3. Test controls: play, pause, seek, volume, fullscreen

### Test 3: View Channel
1. Click on channel name under video
2. See channel profile with subscriber count

### Test 4: Watch History (Requires Login)
1. Login with any email/password (auth still uses real backend)
2. Click your profile → Watch History
3. See your watched videos

### Test 5: Navigation
1. Test all menu items
2. Test responsive mobile view
3. Test error states

---

## Console Logs

When using demo data, you'll see:
```
⚠️ Failed to fetch videos, using mock data for development
```

This is normal! It means the backend is unavailable and demo data is being used.

---

## Backend Connection

To use the **real backend** when it's running:

**Option 1: Local Backend**
- Update in `src/config/constants.js`:
  ```javascript
  export const API_BASE_URL = 'http://localhost:8000/api/v1';
  ```

**Option 2: Deployed Backend**
- Already configured to: `https://backend-project-5bs5.onrender.com/api/v1`
- Just make sure backend service is running

---

## Troubleshooting

### Q: Why do I see "Demo Videos"?
**A:** Backend is down. This is normal in development! Videos are loading from mock data.

### Q: How do I use the real backend?
**A:** Start your backend server, then refresh the app. It will detect and connect automatically.

### Q: Can I upload videos with demo data?
**A:** No, uploads still require real backend. Demo mode only works for watching videos.

### Q: Are demo videos stored anywhere?
**A:** No, they're generated in memory. Not persisted anywhere.

### Q: How do I disable demo mode?
**A:** Remove the try-catch fallback in `src/services/videoService.js` (not recommended).

---

## Best Practices

1. **Development:** Use demo data for rapid UI development
2. **Testing:** Test with backend when available
3. **Deployment:** Backend will be required in production
4. **Performance:** Demo requests are faster (no network delay)

---

## Next Steps

1. ✅ Verify app loads without errors
2. ✅ Browse demo videos
3. ✅ Test video playback
4. ✅ Connect real backend when ready
5. ✅ Deploy to production

---

**Happy developing!** 🚀
