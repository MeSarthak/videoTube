import { memo } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';

// Main Layout component
const Layout = memo(() => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
});

Layout.displayName = 'Layout';

export default Layout;
