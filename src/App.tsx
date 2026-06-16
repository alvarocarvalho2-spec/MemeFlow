import { Navigate, createBrowserRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { Feed } from '@/pages/Feed';
import { Explore } from '@/pages/Explore';
import { Upload } from '@/pages/Upload';
import { VideoDetail } from '@/pages/VideoDetail';
import { Profile } from '@/pages/Profile';
import { ProfileEdit } from '@/pages/ProfileEdit';
import { ChatList } from '@/pages/ChatList';
import { ChatRoom } from '@/pages/ChatRoom';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { ForgotPassword } from '@/pages/ForgotPassword';

function MeRedirect() {
  const { profile } = useAuth();
  return <Navigate to={profile?.username ? `/profile/${profile.username}` : '/profile/edit'} replace />;
}

export const router = createBrowserRouter(
  [
    {
      element: <Layout />,
      children: [
        { path: '/', element: <ProtectedRoute><Feed /></ProtectedRoute> },
        { path: '/explore', element: <Explore /> },
        { path: '/upload', element: <ProtectedRoute><Upload /></ProtectedRoute> },
        { path: '/video/:id', element: <VideoDetail /> },
        { path: '/profile/edit', element: <ProtectedRoute><ProfileEdit /></ProtectedRoute> },
        { path: '/profile/:username', element: <Profile /> },
        { path: '/chat', element: <ProtectedRoute><ChatList /></ProtectedRoute> },
        { path: '/chat/:userId', element: <ProtectedRoute><ChatRoom /></ProtectedRoute> },
        { path: '/me', element: <ProtectedRoute><MeRedirect /></ProtectedRoute> },
        { path: '/login', element: <Login /> },
        { path: '/register', element: <Register /> },
        { path: '/forgot-password', element: <ForgotPassword /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
);
