declare module "canvas-confetti" {
  interface ConfettiOptions {
    particleCount?: number;
    angle?: number;
    spread?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    zIndex?: number;
    colors?: string[];
    shapes?: Array<"square" | "circle">;
    scalar?: number;
    disableForReducedMotion?: boolean;
  }

  function confetti(options?: ConfettiOptions): void;
  export default confetti;
}


