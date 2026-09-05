import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { finishGoogleAuth, setAuthStorage } from '../lib/api';
import { hydrateAuthState, getOnboardingRedirectPath } from '../lib/auth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const type = searchParams.get('type') || null;
        const nextParam = searchParams.get('next');
        const response = await finishGoogleAuth(type);
        setAuthStorage(response);

        // Fetch complete profile data to determine correct redirect path
        const hydrationResult = await hydrateAuthState();
        
        // If this is a login (user already has onboarding data), redirect to their dashboard
        // If this is a new signup, redirect to onboarding
        let nextPath = nextParam || '/onboarding/role';
        
        if (hydrationResult) {
          const { profile, userType } = hydrationResult;
          const dashboardPath = getOnboardingRedirectPath({ userType, profile });
          if (!dashboardPath.includes('onboarding')) {
            nextPath = dashboardPath;
          } else if (nextParam && nextParam !== '/dashboard') {
            nextPath = nextParam;
          }
        }

        navigate(nextPath, { replace: true });
      } catch (err) {
        setError(err.message || 'Google sign-in could not be completed.');
      }
    };

    run();
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0F] px-6 text-center text-white">
      <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <h1 className="text-2xl font-semibold">Finishing sign-in</h1>
        <p className="mt-3 text-sm text-zinc-400">
          We’re completing your Google authentication and redirecting you back into Clinq.
        </p>
        {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
