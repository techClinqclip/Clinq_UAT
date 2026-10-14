import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { getOnboardingRedirectPath, hydrateAuthState, getStoredAuthState } from '../../lib/auth';
import { getDashboardPath } from '../../lib/api';
import LoadingScreen from '../../shared/ui/LoadingScreen';

function resolveAuthenticatedTarget(userType, profile) {
  const onboardingTarget = getOnboardingRedirectPath({ userType, profile });
  if (onboardingTarget === '/onboarding/role') {
    return getDashboardPath(userType, '/onboarding/role');
  }

  return onboardingTarget;
}

function isPublicPath(pathname) {
  return [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/auth/callback',
    '/marketplace',
    '/discover',
    '/community',
    '/leaderboard',
    '/blogs',
    '/messages',
    '/about',
    '/privacy',
    '/terms',
  ].some((allowed) => pathname === allowed || pathname.startsWith(`${allowed}/`));
}

export default function AuthGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Start ready=true for routes that need no async auth check (callback,
  // public pages, login/signup with no token). This prevents AuthGuard's
  // own "Checking your session…" screen from flashing for one frame before
  // those routes render — most visible when Google OAuth redirects back to
  // /auth/callback.
  const [ready, setReady] = useState(() => {
    if (typeof window === 'undefined') return false;
    const { accessToken } = getStoredAuthState();
    if (accessToken) return false; // need async hydration
    const p = window.location.pathname;
    return (
      p === '/auth/callback' ||
      p === '/login' ||
      p === '/signup' ||
      p === '/forgot-password' ||
      p === '/reset-password' ||
      isPublicPath(p)
    );
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { accessToken, userType, user } = getStoredAuthState();
      const isAuthRoute = location.pathname === '/login' || location.pathname === '/signup';
      const isCallbackRoute = location.pathname === '/auth/callback';
      const isDashboardRoute = location.pathname.startsWith('/brand') || location.pathname.startsWith('/creator') || location.pathname.startsWith('/clipper') || location.pathname.startsWith('/admin');
      const isOnboardingRoute = location.pathname.startsWith('/onboarding');
      const isPublicRoute = isPublicPath(location.pathname);

      if (!accessToken) {
        if (isAuthRoute || isCallbackRoute || isPublicRoute) {
          setReady(true);
          return;
        }

        navigate('/login', { replace: true });
        return;
      }

      const result = await hydrateAuthState();
      if (cancelled) return;

      const resolvedUserType = result?.userType || userType || user?.user_type || '';
      const profile = result?.profile || null;

      if (!result && accessToken && !isAuthRoute) {
        navigate('/login', { replace: true });
        return;
      }

      if (isAuthRoute) {
        navigate('/marketplace', { replace: true });
        return;
      }

      const dashboardRole = location.pathname.split('/')[1];
      const expectedRole = dashboardRole === 'admin' ? 'admin' : dashboardRole;
      if (isDashboardRoute && expectedRole && resolvedUserType !== expectedRole) {
        navigate(getDashboardPath(resolvedUserType, '/marketplace'), { replace: true });
        return;
      }

      if (isDashboardRoute) {
        const nextPath = resolveAuthenticatedTarget(resolvedUserType, profile);
        if (nextPath && nextPath !== location.pathname && nextPath.startsWith('/onboarding/')) {
          navigate(nextPath, { replace: true });
          return;
        }
      }

      if (isOnboardingRoute) {
        const nextPath = resolveAuthenticatedTarget(resolvedUserType, profile);
        if (
          nextPath &&
          nextPath !== location.pathname &&
          (nextPath.startsWith('/brand') || nextPath.startsWith('/creator') || nextPath.startsWith('/clipper'))
        ) {
          navigate(nextPath, { replace: true });
          return;
        }
      }

      if (location.pathname === '/') {
        const nextPath = resolveAuthenticatedTarget(resolvedUserType, profile);
        if (nextPath && nextPath !== location.pathname) {
          navigate(nextPath, { replace: true });
          return;
        }
      }

      if (isCallbackRoute) {
        setReady(true);
        return;
      }(true);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);
  if (!ready) {
    return <LoadingScreen isReady={false} messages={["Checking your session..."]} onFinish={() => {}} />;
  }
  
  return <Outlet />;
}
