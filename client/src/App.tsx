import { useState, useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/dashboard";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";
import Profile from "@/pages/profile";
import About from "@/pages/about";
import BiometricLogin from "@/components/biometric-login";
import BiometricSetupPrompt from "@/components/biometric-setup-prompt";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/lib/auth";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { getBiometricToken } from "@/lib/biometric";

function AppRoutes() {
  const [location, setLocation] = useLocation();
  const [showBiometricLogin, setShowBiometricLogin] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const { user, hasBiometricToken, generateTokenAfterLogin } = useAuth();
  const { biometricEnabled } = useUserPreferences();

  // Check for biometric login on app start
  useEffect(() => {
    const checkBiometricLogin = () => {
      // Only check for biometric login on the login route
      if (location === '/login' && !user) {
        const token = getBiometricToken();
        if (token && biometricEnabled) {
          setShowBiometricLogin(true);
          return;
        }
      }
      setShowBiometricLogin(false);
    };

    checkBiometricLogin();
  }, [location, user, biometricEnabled]);

  // Show biometric setup prompt after successful login
  // But only after tour is complete (if tour is running)
  useEffect(() => {
    if (user && location === '/' && biometricEnabled && !showBiometricSetup) {
      const checkForTourAndShowBiometric = () => {
        // Check if tour is running or has been completed
        const tourDone = sessionStorage.getItem('lockify-tour-done');
        const tourRunning = (window as any).__lockifyTourRunning;
        
        // If tour is running, wait for it to complete
        if (tourRunning && !tourDone) {
          // Check again in 500ms
          setTimeout(checkForTourAndShowBiometric, 500);
          return;
        }
        
        // If user hasn't completed onboarding, wait for tour to finish
        if (!user.hasCompletedOnboarding && !tourDone) {
          setTimeout(checkForTourAndShowBiometric, 500);
          return;
        }
        
        // Tour is done or not needed, show biometric setup
        setShowBiometricSetup(true);
      };
      
      // Initial delay to let dashboard load
      const timer = setTimeout(checkForTourAndShowBiometric, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, location, biometricEnabled, showBiometricSetup]);

  const handleBiometricLoginSuccess = () => {
    setShowBiometricLogin(false);
    setLocation('/');
  };

  const handleFallbackToNormal = () => {
    setShowBiometricLogin(false);
    // Stay on login page for normal login
  };

  const handleBiometricSetupComplete = async () => {
    setShowBiometricSetup(false);
    // Generate token after successful biometric setup
    if (user) {
      await generateTokenAfterLogin(user);
    }
  };

  const handleBiometricSetupSkip = () => {
    setShowBiometricSetup(false);
  };

  // Show biometric login if conditions are met
  if (showBiometricLogin) {
    return (
      <BiometricLogin
        onLoginSuccess={handleBiometricLoginSuccess}
        onFallbackToNormal={handleFallbackToNormal}
      />
    );
  }

  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/trash" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/history" component={Dashboard} />
        <Route path="/profile" component={Profile} />
        <Route path="/about" component={About} />
        <Route>{() => <NotFound />}</Route>
      </Switch>
      
      {/* Biometric setup prompt */}
      {showBiometricSetup && user && (
        <BiometricSetupPrompt
          userId={user.id}
          username={user.username}
          onSetupComplete={handleBiometricSetupComplete}
          onSkip={handleBiometricSetupSkip}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppRoutes />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}


