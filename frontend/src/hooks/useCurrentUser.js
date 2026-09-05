import { useEffect, useState } from "react";
import { api, normalizeUserType } from "../lib/api";

function getStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export default function useCurrentUser() {
  const [user, setUser] = useState(() => {
    const storedUser = getStoredUser();
    const role = normalizeUserType(storedUser?.user_type || localStorage.getItem("user_type"));

    return {
      ...(storedUser || {}),
      role,
      name: storedUser?.name || storedUser?.email || "User",
    };
  });

  useEffect(() => {
    let active = true;

    async function hydrateUser() {
      if (typeof window === "undefined") return;

      const token = localStorage.getItem("access_token") || localStorage.getItem("access");
      const storedUser = getStoredUser();

      if (!token) {
        if (active) {
          setUser({ role: "", name: "User" });
        }
        return;
      }

      try {
        const profile = await api("/api/auth/profile/me/");
        const role = normalizeUserType(profile?.user_type || storedUser?.user_type || localStorage.getItem("user_type"));
        const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim()
          || profile?.username
          || profile?.brand_name
          || profile?.company_name
          || profile?.email
          || storedUser?.name
          || "User";

        // Only carry forward a user_type if it's actually valid — otherwise
        // don't let a bad backend value (e.g. literal "null") get written
        // back into storage or state.
        const normalizedProfileUserType = normalizeUserType(profile?.user_type);
        const normalizedStoredUserType = normalizeUserType(storedUser?.user_type);
        const resolvedUserType = normalizedProfileUserType || normalizedStoredUserType || role;

        const nextUser = {
          ...(storedUser || {}),
          ...profile,
          id: profile?.id ?? storedUser?.id ?? null,
          email: profile?.email || storedUser?.email || "",
          name,
          avatar: profile?.avatar || storedUser?.avatar || "",
          user_type: resolvedUserType,
          role,
        };

        if (active) {
          setUser(nextUser);
          localStorage.setItem("user", JSON.stringify({
            ...(storedUser || {}),
            ...profile,
            id: nextUser.id,
            email: nextUser.email,
            name,
            avatar: nextUser.avatar,
            user_type: resolvedUserType,
          }));
          if (resolvedUserType) {
            localStorage.setItem("user_type", resolvedUserType);
          } else {
            localStorage.removeItem("user_type");
          }
        }
      } catch {
        const fallback = {
          ...(storedUser || {}),
          role: normalizeUserType(storedUser?.user_type || localStorage.getItem("user_type")),
          name: storedUser?.name || storedUser?.email || "User",
        };

        if (active) setUser(fallback);
      }
    }

    hydrateUser();
    return () => {
      active = false;
    };
  }, []);

  return user;
}