import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCountriesData } from "../hooks/useCountriesData"; // Assuming this hook exists
import darkLeatherTexture from "../assets/dark-leather.jpg";
import Map from "../components/Map";
import { supabase } from "../lib/supabase/client";
import posthog from 'posthog-js'
import { createStoredUserProfileFromSession, saveStoredUserProfile, type AuthProvider } from "../types/user";

interface WelcomeFormState {
  email: string;
  password: string;
  error: string;
  isLoading: boolean;
}

interface QuestionnaireFormState {
  isLoading: boolean;
}

const AUTH_CACHE_KEY = "tripjournal:auth:v1";

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

function MicrosoftIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 23 23" className="h-6 w-6">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
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
  const { countriesData, isLoading: isCountriesLoading } = useCountriesData();
  const [isAuthReady, setIsAuthReady] = useState<boolean>(() => Boolean(getStoredAuth()));
  const [formState, setFormState] = useState<WelcomeFormState>({
    email: "",
    password: "",
    error: "",
    isLoading: false,
  });
  const [showSignUp, setShowSignUp] = useState<boolean>(false);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [questionnaire, setQuestionnaire] = useState({ firstName: "", lastName: "" });
  const [isQuestionnaireLoading, setIsQuestionnaireLoading] = useState(false);

  const isProfileIncomplete = (user: { 
    user_metadata?: { 
      full_name?: string; 
      first_name?: string; 
      last_name?: string 
    } 
  } | null) => {
    if (!user) return false;
    const metadata = user.user_metadata;
    const hasName = metadata?.full_name || (metadata?.first_name && metadata?.last_name);
    return !hasName;
  };

  // This useEffect has a lot of responsibility.
  // Consider extracting auth logic into a custom hook `useAuth`
  // which could return { sessionUser, isAuthReady, error }
  // and handle the onAuthStateChange subscription internally.
  // This would simplify the Welcome component significantly.
  // e.g. const { user, isAuthReady, error } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const redirectIfOnWelcome = () => {
      if (location.pathname === "/welcome" || location.pathname === "/") {
        navigate("/countries", { replace: true });
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
        if (isProfileIncomplete(sessionUser)) {
          setShowQuestionnaire(true);
        } else {
          setIsAuthReady(true);
          redirectIfOnWelcome();
        }
      }
    }

    void syncSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        return;
      }

      saveAuth(getAuthUserFromSession(session.user));

      // Capture successful login event
      if (_event === 'SIGNED_IN') {
        try {
          posthog.capture('user_login', {
            method: session.user.app_metadata?.provider || 'email',
            is_social: !!session.user.app_metadata?.provider && session.user.app_metadata.provider !== 'email'
          });
        } catch { /* ignore analytics errors */ }
      }

      if (isProfileIncomplete(session.user)) {
        setShowQuestionnaire(true);
      } else {
        setIsAuthReady(true);
        redirectIfOnWelcome();
      }
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

  // This handler could be part of a `useQuestionnaire` hook or a separate `QuestionnaireForm` component
  // to separate concerns from the main Welcome page logic.
  // The hook could expose: `submitProfile`, `isLoading`, `error`.
  // e.g. const { submitProfile, isLoading, error } = useQuestionnaire();
  const handleQuestionnaireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionnaire.firstName.trim() || !questionnaire.lastName.trim()) {
      setFormState(prev => ({ ...prev, error: "Please provide both name and surname" }));
      return;
    }

    setIsQuestionnaireLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          first_name: questionnaire.firstName.trim(),
          last_name: questionnaire.lastName.trim(),
          full_name: `${questionnaire.firstName.trim()} ${questionnaire.lastName.trim()}`,
          username: `${questionnaire.firstName.trim()} ${questionnaire.lastName.trim()}`
        }
      });

      if (error) throw error;
      if (data.user) {
        saveAuth(getAuthUserFromSession(data.user));
      }
      setIsAuthReady(true);
      navigate("/countries", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile.";
      setFormState(prev => ({ ...prev, error: message }));
    } finally {
      setIsQuestionnaireLoading(false);
    }
  };

  // This handler is very large and handles both sign-up and sign-in.
  // It could be simplified by moving it into the proposed `useAuth` hook
  // as two separate methods, e.g., `signInWithPassword` and `signUpWithEmail`.
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
            emailRedirectTo: window.location.origin
          }
        });

        if (error) {
          throw error;
        }

        const sessionUser = data.session?.user;
        if (sessionUser) {
          try {
            posthog.capture('account_created', {
              method: sessionUser.app_metadata?.provider ? sessionUser.app_metadata.provider : 'email',
              confirmationRequired: false
            });
          } catch {
            // ignore
          }
          if (isProfileIncomplete(sessionUser)) {
            setShowQuestionnaire(true);
          } else {
            saveAuth(getAuthUserFromSession(sessionUser));
            setIsAuthReady(true);
            navigate("/countries", { replace: true });
          }
        } else {
          try {
            posthog.capture('account_created', {
              method: 'email',
              confirmationRequired: true
            });
          } catch {
            // ignore
          }
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
          if (isProfileIncomplete(data.session.user)) {
            setShowQuestionnaire(true);
          } else {
            saveAuth(getAuthUserFromSession(data.session.user));
            setIsAuthReady(true);
            navigate("/countries", { replace: true });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      setFormState((prev) => ({ ...prev, error: message }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // This could also be part of the `useAuth` hook.
  // e.g., `signInWithGoogle`, `signInWithAzure`.
  const handleSocialAuth = async (provider: "google" | "azure") => {
    setFormState((prev) => ({ ...prev, isLoading: true, error: "" }));

    try {

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
          scopes: provider === 'azure' ? 'openid email profile' : undefined,
          queryParams: provider === 'azure' ? { prompt: 'select_account' } : undefined,
        }
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        console.log(`Redirecting user to ${provider} login screen...`, data.url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Social sign-in failed. Please try again.";
      setFormState((prev) => ({ ...prev, error: message, isLoading: false }));
    }
  };

  const handleEnterTripJournal = () => {
    navigate("/countries", { replace: true });
  };

  // This entire block could be a separate component, e.g., `<QuestionnaireScreen />`
  // which would be rendered conditionally in your router or App component.
  if (showQuestionnaire) {
    return (
      <div
        className="relative min-h-screen flex items-center justify-center text-[#FFEAD4]"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.8) 100%), url(${darkLeatherTexture})`,
          backgroundSize: "cover",
        }}
      >
        <div className="w-full max-w-md p-8 rounded-[2rem] border border-[#EAB681]/70 bg-[#5A392B] shadow-[0_30px_90px_rgba(0,0,0,0.55)]">
          <div className="text-center mb-8">
            <h2 className="font-adamina text-3xl">One last step</h2>
            <p className="mt-2 font-cormorant text-[#FABE7D]">Please introduce yourself to your journal.</p>
          </div>
          <form onSubmit={handleQuestionnaireSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block font-cormorant text-sm text-[#EAB681]">First Name</label>
              <input
                type="text"
                required
                value={questionnaire.firstName}
                onChange={(e) => setQuestionnaire(prev => ({ ...prev, firstName: e.target.value }))}
                className="w-full rounded-full border border-[#EAB681]/60 bg-[#1a1a1a]/90 px-4 py-3 font-cormorant text-[#FFEAD4] outline-none transition focus:border-[#FABE7D]"
              />
            </div>
            <div>
              <label className="mb-2 block font-cormorant text-sm text-[#EAB681]">Last Name</label>
              <input
                type="text"
                required
                value={questionnaire.lastName}
                onChange={(e) => setQuestionnaire(prev => ({ ...prev, lastName: e.target.value }))}
                className="w-full rounded-full border border-[#EAB681]/60 bg-[#1a1a1a]/90 px-4 py-3 font-cormorant text-[#FFEAD4] outline-none transition focus:border-[#FABE7D]"
              />
            </div>
            {formState.error && (
              <div className="rounded-2xl border border-[#FABE7D]/50 bg-[#FABE7D] px-4 py-3 font-cormorant text-sm text-[#5A392B]">
                {formState.error}
              </div>
            )}
            <button
              type="submit"
              disabled={isQuestionnaireLoading}
              className="w-full rounded-full bg-[#EAB681] px-4 py-3 font-cormorant text-lg font-semibold text-[#1a1a1a] transition hover:brightness-110 disabled:opacity-50"
            >
              {isQuestionnaireLoading ? "Saving..." : "Start your journey"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // The main return block is also very large.
  // It could be broken down into smaller components like:
  // <WelcomeContent />, <AuthForm />, <GlobePreview />
  return (
    <div
      className="relative min-h-screen overflow-hidden text-[#FFEAD4]"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 34%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.06) 78%, rgba(0,0,0,0) 100%), url(${darkLeatherTexture})`,
        backgroundSize: "cover",
        backgroundPosition: "center right",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, rgba(234,182,129,0.18), transparent 24%), radial-gradient(circle at 70% 55%, rgba(122,63,0,0.24), transparent 28%), radial-gradient(circle at 85% 12%, rgba(255,234,212,0.1), transparent 20%)",
        }}
      />

      <div className="relative mx-auto grid min-h-screen max-w-[1400px] items-center gap-10 px-6 py-8 lg:grid-cols-[1fr_0.9fr] lg:px-10 xl:px-14">
        <div className="relative z-10 max-w-lg">
          <div className="mb-8 flex items-center gap-4">
            <div className="h-px w-16 bg-[#EAB681]" />
            <span className="font-cormorant text-xs uppercase tracking-[0.4em] text-[#EAB681]/80">Welcome to</span>
          </div>

          <h1 className="font-adamina text-5xl leading-none text-[#FFEAD4] sm:text-6xl lg:text-7xl">
            TripJournal
          </h1>

          <p className="mt-5 max-w-lg font-cormorant text-lg leading-relaxed text-[#FABE7D] sm:text-xl">
            A travel diary for marking countries, storing notes, and keeping the journeys that shaped you.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm font-cormorant text-[#EAB681]/80">
            <span className="rounded-full border border-[#EAB681]/35 bg-[#5A392B]/65 px-3 py-1">Local save</span>
            <span className="rounded-full border border-[#EAB681]/35 bg-[#5A392B]/65 px-3 py-1">Country tracking</span>
            <span className="rounded-full border border-[#EAB681]/35 bg-[#5A392B]/65 px-3 py-1">Diary notes</span>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleEnterTripJournal}
              className="rounded-full border border-[#EAB681] bg-[#EAB681] px-6 py-2.5 font-cormorant text-base font-semibold text-[#1a1a1a] transition hover:brightness-110"
            >
              {isAuthReady ? "Continue to countries" : "Explore as guest"}
            </button>
          </div>

          <div className="mt-10 w-full max-w-[30rem] rounded-[2rem] border border-[#EAB681]/70 bg-[#5A392B] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.55)] lg:p-6">
            <div className="rounded-[1.5rem] border border-[#FFEAD4]/10 bg-[#5A392B] p-5 lg:p-6">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block font-cormorant text-sm text-[#EAB681]">Email</label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={handleEmailChange}
                    placeholder="you@example.com"
                    className="w-full rounded-full border border-[#EAB681]/60 bg-[#1a1a1a]/90 px-4 py-3 font-cormorant text-[#FFEAD4] outline-none transition focus:border-[#FABE7D]"
                    disabled={formState.isLoading}
                  />
                </div>

                <div>
                  <label className="mb-2 block font-cormorant text-sm text-[#EAB681]">
                    {showSignUp ? "Create password" : "Password"}
                  </label>
                  <input
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
                <IconButton label="Continue with Microsoft" onClick={() => handleSocialAuth("azure")}>
                  <MicrosoftIcon />
                </IconButton>
              </div>

              <div className="mt-4 text-center">
                <a
                  href="#"
                  className="font-cormorant text-xs text-[#EAB681]/70 underline underline-offset-4 transition hover:text-[#FABE7D]"
                >
                  Microsoft account login help (placeholder link)
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-6 flex min-h-[420px] flex-col items-center justify-center gap-4 lg:items-end">
          {isCountriesLoading || !countriesData ? (
            <div className="flex min-h-[420px] w-full max-w-[820px] items-center justify-center px-6 text-center font-cormorant text-sm text-[#EAB681]/80">
              Loading globe...
            </div>
          ) : (
            <div className="w-full max-w-[min(92vw,820px)] rounded-[2.25rem] border border-[#EAB681]/35 bg-[#5A392B]/35 p-3 shadow-[0_28px_80px_rgba(0,0,0,0.42)] backdrop-blur-[1px]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] sm:aspect-square">
                <Map
                  countriesData={countriesData}
                  selectedCountries={[]}
                  viewMode="globe"
                  sizeVariant="compact"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Welcome;
