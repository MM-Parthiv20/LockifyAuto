import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Loader2, ArrowLeft, Moon, Sun, Shield, Target, Lock, Heart, Zap, Eye } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export default function About() {
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const avatarUrl = (() => {
    if (user?.profileimage) return user.profileimage;
    const seed = (user?.id || user?.username || "1").length % 100 || 1;
    return `https://avatar.iran.liara.run/public/${seed}`;
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navbar */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary/10 rounded-lg text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="141" height="166" viewBox="0 0 141 166" className="w-9 h-9 text-primary" fill="currentColor">
                      <path xmlns="http://www.w3.org/2000/svg" d="M70 46L70.5 83L101 101.5V148L69.5 166L0 125V41L31.5 23L70 46ZM8 120L69.5 156.263V120L38.5 102V64L8 46.5V120Z"/>
                      <path xmlns="http://www.w3.org/2000/svg" d="M140.5 125L108.5 143.5V60.5L39 18.5L70 0L140.5 42V125Z"/>
                    </svg>
                  </div>
                  <h1 className="text-xl font-semibold text-foreground">Lumora</h1>
                </div>
              </Link>
            </div>

            {/* Right Side Controls */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2"
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </Button>

              {/* User avatar and username */}
              {user && (
                <div className="flex items-center gap-2 pr-1 cursor-pointer" onClick={() => setLocation("/profile")}>
                  <div className="relative w-7 h-7">
                    {loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-full">
                        <Loader2 className="animate-spin w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <img
                      src={avatarUrl}
                      alt="avatar"
                      className={`w-7 h-7 rounded-full border ${loading ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={() => setLoading(false)}
                      onError={() => setLoading(false)}
                    />
                  </div>
                  <span className="hidden sm:inline text-sm text-foreground">{user.username}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 flex items-center gap-2">
          <ArrowLeft
            className="w-8 h-8 rounded-md bg-primary/10 p-1 cursor-pointer"
            onClick={() => setLocation("/profile")}
          />
          <div>
            <h2 className="text-xl sm:text-3xl font-bold text-foreground">About Us</h2>
          </div>
        </div>

        {/* About Content */}
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Mission Section */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 rounded-lg p-2">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Our Mission</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Lumora is a modern, secure password management solution designed to simplify your digital life. 
              In an age where we juggle dozens of online accounts, remembering complex passwords for each one 
              is nearly impossible. That's where Lumora comes in—we make password security accessible, 
              intuitive, and reliable for everyone.
            </p>
          </div>

          {/* What We Believe Section */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 rounded-lg p-2">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">What We Believe</h3>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="bg-primary/10 rounded-full p-2 h-fit">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Security First</h4>
                  <p className="text-muted-foreground text-sm">
                    Your data is encrypted and protected with industry-standard security measures. 
                    Your master password never leaves your device unencrypted.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-primary/10 rounded-full p-2 h-fit">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Simple & Efficient</h4>
                  <p className="text-muted-foreground text-sm">
                    We believe security shouldn't be complicated. Lumora provides an intuitive interface 
                    that makes managing your passwords effortless and fast.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-primary/10 rounded-full p-2 h-fit">
                  <Eye className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-1">Privacy Matters</h4>
                  <p className="text-muted-foreground text-sm">
                    We respect your privacy. Your passwords and personal information are yours alone—
                    we don't sell your data or track your activities.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 rounded-lg p-2">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">Key Features</h3>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Secure password vault with master password protection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Password generator for creating strong, unique passwords</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Organize credentials by categories and domains</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Search and filter capabilities for quick access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Activity history tracking and trash recovery</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Beautiful dark and light themes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Responsive design for all devices</span>
              </li>
            </ul>
          </div>

          {/* About the Creator Section */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary/10 rounded-lg p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-primary">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-foreground">About the Creator</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Lumora was created by a passionate developer dedicated to building tools that enhance 
              digital security without compromising user experience. With a background in web development 
              and a deep commitment to privacy, the goal was to create a password manager that anyone 
              can trust and use with confidence.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This project combines modern web technologies with security best practices to deliver 
              a robust solution that helps users take control of their online security. Whether you're 
              managing a handful of accounts or hundreds, Lumora is designed to scale with your needs.
            </p>
          </div>

          {/* Call to Action */}
          <div className="rounded-lg border bg-primary/5 border-primary/20 p-6 text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">Ready to secure your digital life?</h3>
            <p className="text-muted-foreground mb-4">
              Start organizing and protecting your passwords today with Lumora.
            </p>
            <Link href="/">
              <Button size="lg" className="font-semibold">
                Go to Dashboard
              </Button>
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}


