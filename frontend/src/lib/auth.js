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

// The profile API returns both dedicated columns (e.g. content_interests)
// and the legacy onboarding_data blob. Columns default to [] / "" in the DB,
// and an empty array is truthy in JS, so `column || blob` never falls back.
// Always take the first value that actually has content.
function firstNonEmptyArray(...candidates) {
  for (const value of candidates) {
    if (Array.isArray(value) && value.length > 0) return value;
  }
  return [];
}

function firstNonBlank(...candidates) {
  for (const value of candidates) {
    if (value !== null && value !== undefined && String(value).trim()) return String(value);
  }
  return '';
}

function hasAnyHandle(...candidates) {
  return candidates.some(
    (handles) =>
      handles && typeof handles === 'object' && Object.values(handles).some((value) => String(value || '').trim())
  );
}

export function getOnboardingRedirectPath({ userType, profile }) {
  const normalizedRole = String(userType || '').toLowerCase();
  const onboardingData = profile?.onboarding_data || {};

  if (normalizedRole === 'admin') return '/admin/dashboard';

  if (normalizedRole === 'brand') {
    const hasCompanyDetails = Boolean(
      firstNonBlank(profile?.company_name, profile?.brand_name, onboardingData?.companyName)
    );
    const hasManagerDetails = Boolean(
      (firstNonBlank(profile?.manager_first_name) && firstNonBlank(profile?.manager_last_name)) ||
      (firstNonBlank(onboardingData?.managerFirstName) && firstNonBlank(onboardingData?.managerLastName))
    );
    return hasCompanyDetails && hasManagerDetails ? '/brand/dashboard' : '/onboarding/brand';
  }

  if (normalizedRole === 'creator') {
    const niche = firstNonBlank(profile?.primary_niche, onboardingData?.niche);
    const interests = firstNonEmptyArray(profile?.content_interests, onboardingData?.interests);
    // Platform handles are optional — the onboarding form allows skipping them,
    // so requiring a non-empty handle here causes a redirect loop for creators
    // who submitted with all-blank handles.
    return niche && interests.length > 0 ? '/creator/dashboard' : '/onboarding/creator';
  }

  if (normalizedRole === 'clipper') {
    const experience = firstNonBlank(
      profile?.experience_level,
      onboardingData?.experienceLevel,
      onboardingData?.experience
    );
    const tools = firstNonEmptyArray(profile?.editing_tools, onboardingData?.editingTools, onboardingData?.tools);
    const skills = firstNonEmptyArray(profile?.skills, onboardingData?.skills);
    const interests = firstNonEmptyArray(onboardingData?.categories, onboardingData?.interests);
    const hasHandle = hasAnyHandle(profile?.handles, onboardingData?.handles);
    return experience && tools.length > 0 && skills.length > 0 && interests.length > 0 && hasHandle
      ? '/clipper/dashboard'
      : '/onboarding/clipper';
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
        ...profile,
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