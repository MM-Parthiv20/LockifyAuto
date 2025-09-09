import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Plus, Search, Key, CheckCircle } from "lucide-react";
import { AppLogo } from "@/components/app-logo";

interface OnboardingGuideProps {
  isOpen: boolean;
  onComplete: () => void;
}

const onboardingSteps = [
  {
    title: "Welcome to Lumora",
    description: "Your secure password manager is ready to protect your digital life.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="141"
        height="166"
        viewBox="0 0 141 166"
        className="w-9 h-9 text-foreground"
        fill="currentColor"
      >
        <path d="M70 46L70.5 83L101 101.5V148L69.5 166L0 125V41L31.5 23L70 46ZM8 120L69.5 156.263V120L38.5 102V64L8 46.5V120Z"/>
        <path d="M140.5 125L108.5 143.5V60.5L39 18.5L70 0L140.5 42V125Z"/>
      </svg>
    ),
    content: "Lumora keeps your passwords safe with military-grade encryption. All your data is protected by your master password.",
  },
  {
    title: "Add Your First Password",
    description: "Start by storing your first email and password combination.",
    icon: Plus,
    content: "Click the 'Add New Record' button to store your first password. Each record contains an email, password, and optional description.",
  },
  {
    title: "Use the Password Generator",
    description: "Generate strong, secure passwords for better protection.",
    icon: Key,
    content: "Use our built-in password generator to create strong, unique passwords for each of your accounts. The generator allows you to customize length and character types.",
  },
  {
    title: "Search and Organize",
    description: "Quickly find your passwords when you need them.",
    icon: Search,
    content: "Use the search bar to quickly find specific records by email or description. You can also sort and filter your records for better organization.",
  },
];

export function OnboardingGuide({ isOpen, onComplete }: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const currentStepData = onboardingSteps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onComplete(); }}>
      <DialogContent className="sm:max-w-lg" data-testid="modal-onboarding" aria-describedby="onboarding-description">
        <DialogHeader className="text-center space-y-4">
          <div className="bg-primary rounded-lg p-3 w-fit mx-auto">
            {typeof Icon === 'object' ? Icon : <Icon className="w-8 h-8 text-primary-foreground" />}
          </div>
          <DialogTitle data-testid="text-onboarding-title">
            {currentStepData.title}
          </DialogTitle>
          <p id="onboarding-description" className="text-sm text-muted-foreground">
            {currentStepData.description}
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress Indicators */}
          <div className="flex justify-center space-x-2">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index <= currentStep ? "bg-primary" : "bg-muted"
                }`}
                data-testid={`progress-dot-${index}`}
              />
            ))}
          </div>

          {/* Step Content */}
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-onboarding-content">
                {currentStepData.content}
              </p>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              data-testid="button-onboarding-skip"
            >
              Skip Tutorial
            </Button>
            
            <div className="flex gap-2 flex-1">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1"
                  data-testid="button-onboarding-previous"
                >
                  Previous
                </Button>
              )}
              
              <Button
                onClick={handleNext}
                className="flex-1"
                data-testid="button-onboarding-next"
              >
                {currentStep === onboardingSteps.length - 1 ? (
                  <span className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                  </span>
                ) : (
                  "Next"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}