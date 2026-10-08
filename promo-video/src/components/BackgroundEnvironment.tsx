import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { TOKENS } from "../tokens";

export interface BackgroundEnvironmentProps {
  glowColor?: string;
  intensity?: number;
  showWarp?: boolean;
}

export const BackgroundEnvironment: React.FC<BackgroundEnvironmentProps> = ({
  glowColor = TOKENS.colors.cyanPrimary,
  intensity = 1.0,
  showWarp = false,
}) => {
  const frame = useCurrentFrame();

  // Floating ambient lighting oscillation
  const glowX = 40 + Math.sin(frame * 0.04) * 15;
  const glowY = 35 + Math.cos(frame * 0.03) * 10;

  // Perspective grid scroll
  const gridOffsetY = (frame * 1.5) % 60;

  // Warp starfield particles
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: ((i * 137.5) % 1920),
      y: ((i * 243.1) % 1080),
      size: (i % 3) + 1.5,
      speed: (i % 4) + 1.5,
      seed: i,
    }));
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: TOKENS.colors.bgVoid,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Dynamic Ambient Spotlights */}
      <div
        style={{
          position: "absolute",
          top: `${glowY - 20}%`,
          left: `${glowX - 25}%`,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor}24 0%, transparent 70%)`,
          filter: "blur(80px)",
          opacity: intensity,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-15%",
          right: "5%",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${TOKENS.colors.emeraldPulse}1f 0%, transparent 70%)`,
          filter: "blur(90px)",
          opacity: intensity,
        }}
      />

      {/* Receding Perspective Cyber Grid */}
      <div
        style={{
          position: "absolute",
          left: "-20%",
          right: "-20%",
          bottom: "-30%",
          height: "75%",
          perspective: 600,
          transformStyle: "preserve-3d",
          opacity: 0.35 * intensity,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: "rotateX(72deg)",
            backgroundImage: `
              linear-gradient(to right, ${TOKENS.colors.gridLines} 1px, transparent 1px),
              linear-gradient(to bottom, ${TOKENS.colors.gridLines} 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: `0px ${gridOffsetY}px`,
            maskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, transparent 90%)",
            WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 15%, transparent 90%)",
          }}
        />
      </div>

      {/* Floating Speed Particles / Warp Streaks */}
      {particles.map((p) => {
        const curY = (p.y + frame * (showWarp ? p.speed * 8 : p.speed * 0.8)) % 1080;
        const streakHeight = showWarp ? p.size * 18 : p.size * 2;
        const opacity = interpolate(
          (frame + p.seed * 10) % 60,
          [0, 30, 60],
          [0.2, 0.8, 0.2]
        );

        return (
          <div
            key={p.id}
            style={{
              position: "absolute",
              left: p.x,
              top: curY,
              width: p.size,
              height: streakHeight,
              borderRadius: p.size / 2,
              background: showWarp ? TOKENS.colors.cyanPrimary : "#ffffff",
              opacity: opacity * intensity,
              boxShadow: showWarp ? `0 0 12px ${TOKENS.colors.cyanPrimary}` : "none",
            }}
          />
        );
      })}

      {/* Cinematic Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 45%, rgba(3, 5, 10, 0.85) 100%)",
        }}
      />
    </div>
  );
};
