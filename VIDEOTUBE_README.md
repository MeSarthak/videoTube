# VideoTube - Modern Video Streaming Platform

A scalable, production-ready video streaming platform built with React, featuring adaptive bitrate (ABR) streaming, user authentication, and modern UI/UX.

## 🚀 Features

### Core Features
- **User Authentication** - Secure login/register with JWT tokens
- **Video Upload** - Support for MP4, WebM, OGG formats up to 500MB
- **HLS Streaming** - Adaptive bitrate streaming with multiple quality variants
- **Channel Profiles** - User channels with subscribers and video management
- **Watch History** - Track and view previously watched videos
- **Responsive Design** - Mobile-first design that works on all devices

### Technical Features
- **Performance Optimized** - Following Vercel React Best Practices
  - SWR for data fetching with automatic deduplication
  - React.memo for component optimization
  - Bundle size optimization
  - Lazy loading and code splitting
- **Modern Stack** - React 19, Vite, Tailwind CSS
- **Error Handling** - Comprehensive error boundaries and validation
- **Token Management** - Automatic token refresh on expiry
- **HLS Video Player** - Custom video player with quality selection

## 📦 Tech Stack

### Frontend
- **React 19** - Latest React with hooks and modern patterns
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **SWR** - Data fetching with caching and deduplication
- **Axios** - HTTP client with interceptors
- **HLS.js** - HTTP Live Streaming support
- **React Hot Toast** - Beautiful toast notifications
- **date-fns** - Modern date utility library

### Best Practices Implemented
Following [Vercel React Best Practices](./skills/vercel-react-best-practices/):
- ✅ Bundle optimization with direct imports
- ✅ Client-side data deduplication with SWR
- ✅ Component memoization for performance
- ✅ Rendering optimization with conditional renders
- ✅ Error boundaries for graceful error handling
- ✅ Content visibility for long lists

## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Common components (Button, Input, etc.)
│   ├── layout/         # Layout components (Header, Layout)
│   ├── video/          # Video-specific components
│   └── auth/           # Authentication components
├── pages/              # Page components
├── hooks/              # Custom React hooks
├── services/           # API service layer
├── contexts/           # React contexts
├── utils/              # Utility functions
├── config/             # Configuration files
└── assets/             # Static assets

Key Directories:
- components/common: Reusable UI components
- components/video: VideoCard, VideoPlayer, VideoGrid
- services: API integration layer with auth, user, video services
- hooks: Custom hooks for data fetching (useVideo, useUser)
- contexts: AuthContext for authentication state
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd videoTube
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

### Build for Production
```bash
npm run build
npm run preview
```

## 🔑 API Integration

The frontend connects to the VideoTube backend API deployed at:
```
https://backend-project-5bs5.onrender.com/api/v1
```

### API Configuration
All API endpoints are configured in `src/config/constants.js`:
- Authentication: Login, Register, Logout
- User Management: Profile updates, avatar/cover upload
- Video: Upload, streaming, watch history
- Channel: Channel profiles, subscribers

### Authentication Flow
1. User registers/logs in
2. JWT tokens stored in localStorage
3. Access token sent with each API request
4. Automatic token refresh on expiry
5. Redirect to login on auth failure

## 📱 Pages & Routes

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | Home | Public | Video discovery page |
| `/login` | Login | Public | User login |
| `/register` | Register | Public | User registration |
| `/watch/:id` | Watch | Public | Video player page |
| `/channel/:username` | Channel | Public | Channel profile |
| `/upload` | VideoUpload | Protected | Video upload |
| `/watch-history` | WatchHistory | Protected | User watch history |
| `/settings` | Settings | Protected | Account settings |

## 🎨 Components Overview

### Common Components
- **Button** - Multi-variant button with loading states
- **Input** - Form input with validation
- **Modal** - Portal-based modal dialog
- **Card** - Container with hover effects
- **Avatar** - User profile picture
- **Spinner** - Loading indicator
- **ErrorBoundary** - Error catching component

### Video Components
- **VideoCard** - Video thumbnail with metadata
- **VideoPlayer** - HLS player with controls
- **VideoGrid** - Responsive video grid with loading states

### Layout Components
- **Header** - Navigation bar with search
- **Layout** - Main layout wrapper
- **ProtectedRoute** - Route guard for authenticated pages

## 🔐 Authentication

### Features
- Secure JWT-based authentication
- HTTP-only cookies for token storage
- Automatic token refresh
- Protected routes
- Persistent login sessions

### Usage
```javascript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  // Use authentication state
}
```

## 📊 Data Fetching

Using SWR for efficient data fetching:

```javascript
import { useVideos } from './hooks/useVideo';

function VideoList() {
  const { videos, isLoading, isError, mutate } = useVideos();
  // Automatic caching, deduplication, revalidation
}
```

## 🎯 Performance Optimizations

### Implemented Optimizations
1. **Memoization** - React.memo on expensive components
2. **Code Splitting** - Route-based lazy loading
3. **Image Optimization** - Lazy loading images
4. **SWR Caching** - Request deduplication
5. **Content Visibility** - Efficient list rendering
6. **Bundle Size** - Direct imports, tree shaking

### Bundle Size
- Optimized with direct imports (avoiding barrel files)
- HLS.js loaded on-demand
- Minimal dependencies

## 🐛 Error Handling

### Error Boundary
Catches React component errors and displays fallback UI

### API Error Handling
- Axios interceptors for global error handling
- Automatic token refresh on 401
- User-friendly error messages with toast notifications

### Form Validation
- Client-side validation for all forms
- Real-time error feedback
- File type and size validation

## 🎨 Styling

### Tailwind CSS
- Utility-first approach
- Responsive design
- Custom color palette
- Dark mode ready

### Custom Styles
- Custom scrollbar
- Line clamp utilities
- Animation utilities
- Focus styles

## 📝 Best Practices Used

### From Vercel React Best Practices
1. **bundle-barrel-imports** - Direct imports for better tree-shaking
2. **client-swr-dedup** - SWR for request deduplication
3. **rerender-memo** - Memoized components
4. **rerender-dependencies** - Optimized effect dependencies
5. **rendering-conditional-render** - Ternary over && operator
6. **rendering-content-visibility** - Efficient list rendering
7. **js-early-exit** - Early returns in functions

## 🔮 Future Enhancements

- [ ] Video search functionality
- [ ] Comments and likes
- [ ] Subscribe to channels
- [ ] Playlist creation
- [ ] Live streaming support
- [ ] Video recommendations
- [ ] Dark mode
- [ ] Multiple language support
- [ ] Progressive Web App (PWA)
- [ ] Video editing tools

## 📄 License

MIT License - See LICENSE file for details

## 👥 Contributing

Contributions are welcome! Please read the contributing guidelines first.

---

Built with ❤️ using React and modern web technologies
