import React from "react";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
};

export function AppLogo({ className }: AppLogoProps) {
  return (
    <span
      aria-hidden
      className={cn("inline-block align-middle", className)}
      style={{
        WebkitMaskImage: 'url(/images/app-logo.svg)',
        maskImage: 'url(/images/app-logo.svg)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        backgroundColor: 'currentColor',
      }}
    />
  );
}

export default AppLogo;


