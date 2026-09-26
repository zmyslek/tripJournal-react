import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuthRedirectUrl, supabase } from "../lib/supabase/client";
import { createStoredUserProfileFromSession, saveStoredUserProfile, type AuthProvider } from "../types/user";

interface WelcomeFormState {
  email: string;
  password: string;
  error: string;
  isLoading: boolean;
}

const AUTH_CACHE_KEY = "tripjournal:auth:v1";
const FLORENCE_IMAGE_URL =
  "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=1400&q=85";

export interface AuthUser {
  id: string;
  email: string;
  provider: AuthProvider;
  loginTime: string;
}

function getStoredAuth(): AuthUser | null {
  try {
    const stored = localStorage.getItem(AUTH_CACHE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && parsed.email ? parsed : null;
  } catch {
    return null;
  }
}

function saveAuth(user: AuthUser): void {
  try {
    localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(user));
  } catch {
    // Silently fail if localStorage unavailable
  }
}

function getAuthUserFromSession(sessionUser: { id: string; email?: string | null; app_metadata?: { provider?: string } }): AuthUser {
  const profile = createStoredUserProfileFromSession(sessionUser);

  saveStoredUserProfile(profile);

  return {
    id: profile.id,
    email: profile.email,
    provider: profile.authProvider,
    loginTime: profile.loginTime
  };
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-.9 2.4-1.8 3.1v2.6h2.9c1.7-1.6 2.7-4 2.7-6.8 0-.8-.1-1.4-.2-2.1H12Z" />
      <path fill="#34A853" d="M12 22c2.4 0 4.4-.8 5.9-2.2l-2.9-2.6c-.8.5-1.8.8-3 .8-2.3 0-4.2-1.5-4.9-3.6H4.2v2.8A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M7.1 14.4a6 6 0 0 1 0-4.8V6.8H4.2a10 10 0 0 0 0 8.4l2.9-2.8Z" />
      <path fill="#4285F4" d="M12 5c1.3 0 2.5.4 3.4 1.2l2.5-2.5A10 10 0 0 0 12 2 10 10 0 0 0 4.2 6.8l2.9 2.8C7.8 6.5 9.7 5 12 5Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6">
      <path fill="#1877F2" d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1C0 18.1 4.4 23 10.1 24v-8.4H7.1v-3.5h3V9.3c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.3h3.4l-.5 3.5h-2.9V24C19.6 23 24 18.1 24 12.1Z" />
    </svg>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-[#EAB681]/70 bg-white text-[#5A392B] shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthReady, setIsAuthReady] = useState(() => Boolean(getStoredAuth()));
  const [formState, setFormState] = useState<WelcomeFormState>({
    email: "",
    password: "",
    error: "",
    isLoading: false,
  });
  const [showSignUp, setShowSignUp] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const redirectIfOnWelcome = () => {
      if (location.pathname === "/welcome") {
        navigate("/home", { replace: true });
      }
    };

    async function syncSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setFormState((prev) => ({ ...prev, error: "Unable to read your Supabase session." }));
        return;
      }

      const sessionUser = data.session?.user;
      if (sessionUser) {
        saveAuth(getAuthUserFromSession(sessionUser));
        setIsAuthReady(true);
        redirectIfOnWelcome();
      }
    }

    void syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        return;
      }

      saveAuth(getAuthUserFromSession(session.user));
      setIsAuthReady(true);
      redirectIfOnWelcome();
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      email: e.target.value,
      error: "",
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({
      ...prev,
      password: e.target.value,
      error: "",
    }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState((prev) => ({ ...prev, error: "" }));

    if (!formState.email.trim()) {
      setFormState((prev) => ({ ...prev, error: "Email is required" }));
      return;
    }

    if (!validateEmail(formState.email)) {
      setFormState((prev) => ({ ...prev, error: "Please enter a valid email" }));
      return;
    }

    if (!formState.password) {
      setFormState((prev) => ({ ...prev, error: "Password is required" }));
      return;
    }

    if (showSignUp && formState.password.length < 6) {
      setFormState((prev) => ({
        ...prev,
        error: "Password must be at least 6 characters",
      }));
      return;
    }

    setFormState((prev) => ({ ...prev, isLoading: true }));

    try {
      if (showSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: formState.email,
          password: formState.password,
          options: {
            emailRedirectTo: getAuthRedirectUrl()
          }
        });

        if (error) {
          throw error;
        }

        const sessionUser = data.session?.user;
        if (sessionUser) {
          saveAuth(getAuthUserFromSession(sessionUser));
          setIsAuthReady(true);
          navigate("/home", { replace: true });
        } else {
          setFormState((prev) => ({
            ...prev,
            error: "Account created. Check your email to confirm sign-in if email confirmation is enabled."
          }));
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formState.email,
          password: formState.password
        });

        if (error) {
          throw error;
        }

        if (data.session?.user) {
          saveAuth(getAuthUserFromSession(data.session.user));
          setIsAuthReady(true);
          navigate("/home", { replace: true });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      setFormState((prev) => ({ ...prev, error: message }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleSocialAuth = async (provider: "google" | "facebook") => {
    setFormState((prev) => ({ ...prev, isLoading: true, error: "" }));

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getAuthRedirectUrl()
        }
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Social sign-in failed. Please try again.";
      setFormState((prev) => ({ ...prev, error: message, isLoading: false }));
    }
  };

  const handleEnterTripJournal = () => {
    navigate("/home", { replace: true });
  };

  return (
    <div
      className="relative h-screen min-h-screen overflow-hidden bg-[#1f1916] text-[#FFEAD4]"
    >
      <div className="relative mx-auto grid h-full min-h-0 max-w-none grid-cols-1 items-stretch gap-0 px-0 py-0 lg:grid-cols-[44%_56%]">
        <div className="relative z-10 flex h-full min-h-0 w-full max-w-lg flex-col justify-center overflow-hidden px-6 py-6 sm:px-12 lg:mx-auto lg:max-w-[29rem] lg:px-0 lg:py-8">
          <div className="mb-5 flex items-center gap-4">
            <div className="h-px w-16 bg-[#EAB681]" />
            <span className="font-cormorant text-xs uppercase tracking-[0.4em] text-[#EAB681]/80">Welcome to</span>
          </div>

          <h1 className="font-adamina text-5xl leading-none text-[#FFEAD4] sm:text-6xl lg:text-7xl">
            TripJournal
          </h1>

          <p className="mt-4 max-w-lg font-cormorant text-lg leading-relaxed text-[#FABE7D] sm:text-xl">
            A travel diary for marking countries, storing notes, and keeping the journeys that shaped you.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm font-cormorant text-[#EAB681]/80">
            <span className="rounded-full border border-[#EAB681]/35 bg-[#5A392B]/65 px-3 py-1">Local save</span>
            <span className="rounded-full border border-[#EAB681]/35 bg-[#5A392B]/65 px-3 py-1">Country tracking</span>
            <span className="rounded-full border border-[#EAB681]/35 bg-[#5A392B]/65 px-3 py-1">Diary notes</span>
          </div>

          <div className="mt-5">
            <button
              type="button"
              onClick={handleEnterTripJournal}
              className="rounded-full border border-[#EAB681] bg-[#EAB681] px-6 py-2.5 font-cormorant text-base font-semibold text-[#1a1a1a] transition hover:brightness-110"
            >
              {isAuthReady ? "Continue to countries" : "Explore as guest"}
            </button>
          </div>

          <div className="mt-7 w-full max-w-[30rem] rounded-[2rem] border border-[#EAB681]/70 bg-[#2b2623] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.55)] lg:p-5">
            <div className="rounded-[1.5rem] border border-[#FFEAD4]/10 bg-[#2b2623] p-4 lg:p-5">
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <label htmlFor="welcome-email" className="mb-2 block font-cormorant text-sm text-[#EAB681]">Email</label>
                  <input
                    id="welcome-email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleEmailChange}
                    placeholder="you@example.com"
                    className="w-full rounded-full border border-[#EAB681]/60 bg-[#1a1a1a]/90 px-4 py-3 font-cormorant text-[#FFEAD4] outline-none transition focus:border-[#FABE7D]"
                    disabled={formState.isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="welcome-password" className="mb-2 block font-cormorant text-sm text-[#EAB681]">
                    {showSignUp ? "Create password" : "Password"}
                  </label>
                  <input
                    id="welcome-password"
                    name="password"
                    type="password"
                    value={formState.password}
                    onChange={handlePasswordChange}
                    placeholder={showSignUp ? "At least 6 characters" : "Enter password"}
                    className="w-full rounded-full border border-[#EAB681]/60 bg-[#1a1a1a]/90 px-4 py-3 font-cormorant text-[#FFEAD4] outline-none transition focus:border-[#FABE7D]"
                    disabled={formState.isLoading}
                  />
                </div>

                {formState.error && (
                  <div className="rounded-2xl border border-[#FABE7D]/50 bg-[#FABE7D] px-4 py-3 font-cormorant text-sm text-[#5A392B]">
                    {formState.error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formState.isLoading}
                  className="w-full rounded-full bg-[#EAB681] px-4 py-3 font-cormorant text-lg font-semibold text-[#1a1a1a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {formState.isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#1a1a1a] border-t-transparent" />
                      Loading...
                    </span>
                  ) : (
                    showSignUp ? "Create account" : "Continue"
                  )}
                </button>
              </form>

              <div className="mt-4 text-center font-cormorant text-sm text-[#FFEAD4]/80">
                {showSignUp ? "Already have an account?" : "Don't have an account yet?"}{" "}
                <button
                  type="button"
                  onClick={() => setShowSignUp((current) => !current)}
                  className="underline decoration-[#EAB681]/70 underline-offset-4 transition hover:text-[#FABE7D]"
                >
                  {showSignUp ? "Log in" : "Create one"}
                </button>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[#EAB681]/50" />
                <span className="font-cormorant text-xs uppercase tracking-[0.35em] text-[#EAB681]/75">or</span>
                <div className="h-px flex-1 bg-[#EAB681]/50" />
              </div>

              <div className="mt-5 flex items-center justify-center gap-3">
                <IconButton label="Continue with Google" onClick={() => handleSocialAuth("google")}>
                  <GoogleIcon />
                </IconButton>
                <IconButton label="Continue with Facebook" onClick={() => handleSocialAuth("facebook")}>
                  <FacebookIcon />
                </IconButton>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 hidden h-full min-h-0 flex-col items-center justify-center lg:flex lg:items-end">
          <figure className="group relative h-full min-h-0 w-full max-w-none overflow-hidden bg-[#5A392B]">
            <img
              src={FLORENCE_IMAGE_URL}
              alt="Florence, Italy viewed from above"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a]/65 via-transparent to-[#1a1a1a]/75" />
            <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14">
              <p className="font-cormorant text-sm uppercase tracking-[0.28em] text-[#FFEAD4] sm:text-base">
                01 — Florence, Italy
              </p>
              <p className="mt-5 max-w-sm font-adamina text-3xl leading-tight text-[#FFEAD4] sm:text-4xl lg:text-5xl">
                Keep the places that keep you.
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  );
}

export default Welcome;
