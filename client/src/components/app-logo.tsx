import React from "react";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
};

export function AppLogo({ className }: AppLogoProps) {
  const appLogoUrl = new URL('../../images/app-logo.svg', import.meta.url).href;
  return (
    <div
      aria-hidden
      className={cn("align-middle", className)}
      style={{
        WebkitMaskImage: `url(${appLogoUrl})`,
        maskImage: `url(${appLogoUrl})`,
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


