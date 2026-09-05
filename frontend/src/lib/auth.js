import { api, clearAuthStorage, getDashboardPath, getEmailFromAccessToken, getStoredUserType, setAuthStorage } from './api.js';

export function getStoredUser() {
  if (typeof window === 'undefined') return null;

  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

// NEW: single source of truth for "what email did this user sign up / log in with".
// Falls back to decoding the JWT when the stored `user` object is missing
// or doesn't carry an email — this is what was silently breaking the
// company-email check on the brand onboarding screen.
export function getStoredUserEmail() {
  const user = getStoredUser();
  return user?.email || getEmailFromAccessToken() || '';
}

export function getStoredAuthState() {
  const accessToken = localStorage.getItem('access_token') || localStorage.getItem('access');
  const refreshToken = localStorage.getItem('refresh_token') || localStorage.getItem('refresh');
  const user = getStoredUser();
  const userType = getStoredUserType();

  return {
    accessToken,
    refreshToken,
    user,
    userType,
  };
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('access_token') || localStorage.getItem('access'));
}

export function logoutUser() {
  clearAuthStorage();
}

export function getRoleFromPayload(payload) {
  return payload?.user_type || payload?.type || payload?.user?.user_type || payload?.user?.type || '';
}

export function getOnboardingRedirectPath({ userType, profile }) {
  const normalizedRole = String(userType || '').toLowerCase();
  const onboardingData = profile?.onboarding_data || {};

  if (normalizedRole === 'admin') return '/admin/dashboard';

  if (normalizedRole === 'brand') {
    const hasCompanyDetails = Boolean(
      profile?.company_name?.trim() || profile?.brand_name?.trim() || onboardingData?.companyName?.trim()
    );
    const hasManagerDetails = Boolean(
      profile?.manager_first_name?.trim() && profile?.manager_last_name?.trim() ||
      (onboardingData?.managerFirstName?.trim() && onboardingData?.managerLastName?.trim())
    );
    return hasCompanyDetails && hasManagerDetails ? '/brand/dashboard' : '/onboarding/brand';
  }

  if (normalizedRole === 'creator') {
    const niche = profile?.primary_niche || onboardingData?.niche || '';
    const interests = profile?.content_interests || onboardingData?.interests || [];
    const handles = profile?.handles || onboardingData?.handles || {};
    const hasNiche = Boolean(String(niche).trim());
    const hasInterests = Array.isArray(interests) && interests.length > 0;
    const hasPlatform = Boolean(Object.values(handles).some((value) => String(value || '').trim()));
    return hasNiche && hasInterests && hasPlatform ? '/creator/dashboard' : '/onboarding/creator';
  }

  if (normalizedRole === 'clipper') {
    const experience = profile?.experience_level || onboardingData?.experienceLevel || onboardingData?.experience || '';
    const hasExperience = Boolean(String(experience || '').trim());
    const tools = Array.isArray(profile?.editing_tools) ? profile.editing_tools : Array.isArray(onboardingData?.editingTools) ? onboardingData.editingTools : Array.isArray(onboardingData?.tools) ? onboardingData.tools : [];
    const skills = Array.isArray(profile?.skills) ? profile.skills : Array.isArray(onboardingData?.skills) ? onboardingData.skills : [];
    const interests = Array.isArray(onboardingData?.categories) ? onboardingData.categories : Array.isArray(onboardingData?.interests) ? onboardingData.interests : [];
    const hasTools = tools.length > 0;
    const hasSkills = skills.length > 0;
    const hasInterests = interests.length > 0;
    const hasHandle = Boolean(Object.values(profile?.handles || onboardingData?.handles || {}).some((value) => String(value || '').trim()));
    return hasExperience && hasTools && hasSkills && hasInterests && hasHandle ? '/clipper/dashboard' : '/onboarding/clipper';
  }

  return '/onboarding/role';
}

export async function hydrateAuthState() {
  if (!isAuthenticated()) return null;

  try {
    const profile = await api('/api/auth/profile/me/');
    const userType = profile?.user_type || getStoredUserType();

    const payload = {
      user_type: userType,
      user: {
        ...getStoredUser(),
        user_type: userType,
      },
    };

    setAuthStorage(payload);
    return { profile, userType };
  } catch (error) {
    // api() only throws this exact message once it has already tried
    // refreshing the token and that refresh itself failed — i.e. the
    // session really is dead. Any other error (network blip, CORS,
    // transient 500, offline) is NOT proof the session is invalid,
    // so don't clear tokens for it.
    const isAuthFailure = String(error?.message || '').includes('session has expired');

    if (isAuthFailure) {
      logoutUser();
      return null;
    }

    // Transient failure — keep whatever's already in localStorage
    // instead of forcing a logout.
    return {
      profile: null,
      userType: getStoredUserType(),
    };
  }
}