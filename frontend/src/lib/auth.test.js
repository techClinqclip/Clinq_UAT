import test from 'node:test';
import assert from 'node:assert/strict';
import { getOnboardingRedirectPath } from './auth.js';

test('redirects a brand user without onboarding data to the brand onboarding flow', () => {
  const path = getOnboardingRedirectPath({ userType: 'brand', profile: null });
  assert.equal(path, '/onboarding/brand');
});

test('redirects a creator user with saved onboarding data to the dashboard', () => {
  const path = getOnboardingRedirectPath({
    userType: 'creator',
    profile: {
      onboarding_data: {
        niche: 'Gaming',
        interests: ['Shorts / Reels'],
        handles: { youtube: '@demo' },
      },
    },
  });
  assert.equal(path, '/creator/dashboard');
});

test('redirects a creator user with profile-backed onboarding data to the dashboard', () => {
  const path = getOnboardingRedirectPath({
    userType: 'creator',
    profile: {
      primary_niche: 'Gaming',
      content_interests: ['Shorts / Reels'],
      handles: { youtube: '@demo' },
      onboarding_data: {},
    },
  });
  assert.equal(path, '/creator/dashboard');
});

test('redirects a clipper user with partial onboarding to the clipper onboarding flow', () => {
  const path = getOnboardingRedirectPath({
    userType: 'clipper',
    profile: {
      onboarding_data: {
        experience: '1–3 years',
      },
    },
  });
  assert.equal(path, '/onboarding/clipper');
});

test('redirects a clipper user with DB-backed profile fields to the dashboard', () => {
  const path = getOnboardingRedirectPath({
    userType: 'clipper',
    profile: {
      experience_level: '1–3 years',
      editing_tools: ['Premiere Pro'],
      skills: ['Video editing'],
      handles: { instagram: '@demo' },
      onboarding_data: {
        categories: ['Gaming'],
      },
    },
  });
  assert.equal(path, '/clipper/dashboard');
});
