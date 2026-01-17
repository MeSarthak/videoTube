// Mock data for development when backend is unavailable
const mockVideos = [
  {
    _id: '1',
    title: 'Getting Started with React 19',
    description: 'Learn the fundamentals of React 19 and build your first component',
    duration: 1200,
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324ef6db?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u1',
      username: 'reactdev',
      fullname: 'React Developer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reactdev',
      subscribersCount: 5420,
    },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '2',
    title: 'Advanced TypeScript Patterns',
    description: 'Explore advanced patterns and best practices in TypeScript',
    duration: 1800,
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u2',
      username: 'tsexpert',
      fullname: 'TypeScript Expert',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=tsexpert',
      subscribersCount: 3210,
    },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '3',
    title: 'Web Performance Optimization',
    description: 'Master the art of optimizing web applications for speed',
    duration: 2400,
    thumbnail: 'https://images.unsplash.com/photo-1516534775068-bb57e39c2f0b?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u3',
      username: 'perftuner',
      fullname: 'Performance Expert',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=perftuner',
      subscribersCount: 8750,
    },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '4',
    title: 'Tailwind CSS Masterclass',
    description: 'Complete guide to building beautiful UIs with Tailwind CSS',
    duration: 1500,
    thumbnail: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u4',
      username: 'uidesigner',
      fullname: 'UI Designer',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=uidesigner',
      subscribersCount: 12340,
    },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '5',
    title: 'Node.js Best Practices',
    description: 'Learn the best practices for building scalable Node.js applications',
    duration: 2100,
    thumbnail: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u5',
      username: 'backendpro',
      fullname: 'Backend Pro',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=backendpro',
      subscribersCount: 9870,
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '6',
    title: 'Database Design Fundamentals',
    description: 'Design efficient and scalable databases',
    duration: 1900,
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u6',
      username: 'dbexpert',
      fullname: 'Database Expert',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dbexpert',
      subscribersCount: 6543,
    },
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '7',
    title: 'Docker and Kubernetes',
    description: 'Containerize and orchestrate your applications',
    duration: 2800,
    thumbnail: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u7',
      username: 'devops',
      fullname: 'DevOps Master',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=devops',
      subscribersCount: 11200,
    },
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: '8',
    title: 'GraphQL API Design',
    description: 'Build powerful APIs with GraphQL',
    duration: 1600,
    thumbnail: 'https://images.unsplash.com/photo-1516534775068-bb57e39c2f0b?w=400&h=225&fit=crop',
    masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
    owner: {
      _id: 'u8',
      username: 'apiguru',
      fullname: 'API Guru',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=apiguru',
      subscribersCount: 7890,
    },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockVideoService = {
  getVideos: async (page = 1, limit = 20) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const start = (page - 1) * limit;
    const end = start + limit;
    const videos = mockVideos.slice(start, end);
    
    return {
      statusCode: 200,
      data: videos,
      message: 'Videos fetched successfully',
    };
  },

  getVideo: async (videoId) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const video = mockVideos.find(v => v._id === videoId);
    
    if (!video) {
      const error = new Error('Video not found');
      error.response = { status: 404 };
      throw error;
    }
    
    return {
      statusCode: 200,
      data: video,
      message: 'Video fetched successfully',
    };
  },

  uploadVideo: async (videoFile, title, description, onProgress) => {
    // Simulate upload with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (onProgress) onProgress(i);
    }
    
    return {
      statusCode: 201,
      data: {
        _id: Date.now().toString(),
        title,
        description,
        duration: 0,
        thumbnail: 'https://via.placeholder.com/400x225',
        masterPlaylist: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.m3u8',
      },
      message: 'Video uploaded successfully (DEMO MODE)',
    };
  },
};
