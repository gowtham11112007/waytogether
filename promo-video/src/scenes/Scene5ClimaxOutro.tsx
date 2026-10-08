import React from "react";
import { interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TOKENS } from "../tokens";
import { DeviceMockup3D } from "../components/DeviceMockup3D";
import { KineticHUDOverlay } from "../components/KineticHUDOverlay";

export const Scene5ClimaxOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Grand climax spring
  const climaxSpring = spring({
    frame,
    fps,
    config: TOKENS.springs.heroEntrance,
  });

  // Staggered CTA reveal
  const ctaSpring = spring({
    frame: frame - 12,
    fps,
    config: TOKENS.springs.badgeFloat,
  });

  const centerScale = interpolate(climaxSpring, [0, 1], [0.92, 1.04]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);
  const ctaTranslateY = interpolate(ctaSpring, [0, 1], [25, 0]);

  // Floating drift
  const floatY = Math.sin(frame * 0.08) * 2;

  // Shimmer across download CTA button
  const shimmerProgress = (frame % 40) / 40;
  const shimmerX = interpolate(shimmerProgress, [0, 1], [-100, 250]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <KineticHUDOverlay
        eyebrow="FLAGSHIP LAUNCH 2026"
        titlePrimary="KEEP THE JOURNEY"
        titleSecondary="TOGETHER."
        accentColor={TOKENS.colors.emeraldBright}
        badgeText="VERSION 1.0 READY • FREE TO JOIN"
      />

      {/* Triple 3D Device Showcase on Right Stage */}
      <div
        style={{
          position: "absolute",
          right: "11%",
          top: "48%",
          transform: "translateY(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Left Ghost Device (Home Dashboard) */}
        <div
          style={{
            position: "absolute",
            transform: "translateX(-280px) translateZ(-80px)",
            pointerEvents: "none",
          }}
        >
          <DeviceMockup3D
            screenshotSrc={staticFile("screenshots/02_home_dashboard.png")}
            rotateY={24}
            rotateX={4}
            scale={0.82}
            opacity={0.35}
            glowColor={TOKENS.colors.cyanPrimary}
          />
        </div>

        {/* Right Ghost Device (Convoy Health Sheet) */}
        <div
          style={{
            position: "absolute",
            transform: "translateX(280px) translateZ(-80px)",
            pointerEvents: "none",
          }}
        >
          <DeviceMockup3D
            screenshotSrc={staticFile("screenshots/05_convoy_health_sheet.png")}
            rotateY={-24}
            rotateX={4}
            scale={0.82}
            opacity={0.35}
            glowColor={TOKENS.colors.emeraldBright}
          />
        </div>

        {/* Center Hero Device (3D Live Nav) */}
        <div
          style={{
            transform: `translateY(${floatY}px)`,
            zIndex: 10,
          }}
        >
          <DeviceMockup3D
            screenshotSrc={staticFile("screenshots/04_live_group_navigation_3d.png")}
            rotateY={-4}
            rotateX={2}
            scale={centerScale}
            sheenProgress={interpolate(frame, [0, 55], [0.3, 0.9])}
            glowColor={TOKENS.colors.cyanPrimary}
          />
        </div>
      </div>

      {/* Grand CTA Lockup Banner (Left Overlay) */}
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 140,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          zIndex: 60,
          opacity: ctaOpacity,
          transform: `translateY(${ctaTranslateY}px)`,
        }}
      >
        {/* Holographic Logo Brandmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${TOKENS.colors.cyanPrimary}, ${TOKENS.colors.emeraldBright})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: TOKENS.shadows.laserEmerald,
            }}
          >
            {/* SVG Compass Icon */}
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#05070E"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 19 21 12 17 5 21 12 2" />
            </svg>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "-0.02em",
                color: "#ffffff",
                fontFamily: "sans-serif",
              }}
            >
              WAYTOGETHER
            </span>
            <span
              style={{
                fontSize: 12,
                fontFamily: "monospace",
                color: TOKENS.colors.cyanPrimary,
                letterSpacing: "0.2em",
              }}
            >
              THE LIVE CONVOY MAP
            </span>
          </div>
        </div>

        {/* Feature Badges Grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            maxWidth: 480,
            marginTop: 8,
          }}
        >
          {["⚡ Realtime GPS (3s)", "🧭 3D Heading-Up Nav", "🛡️ Convoy Health & SOS", "🎵 Group Music Sync"].map(
            (feat, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  background: TOKENS.colors.bgCardGlass,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "sans-serif",
                  backdropFilter: "blur(12px)",
                }}
              >
                {feat}
              </div>
            )
          )}
        </div>

        {/* Download Call to Action Button */}
        <div
          style={{
            marginTop: 12,
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 36px",
            borderRadius: 30,
            background: `linear-gradient(135deg, ${TOKENS.colors.cyanPrimary}, ${TOKENS.colors.emeraldBright})`,
            boxShadow: TOKENS.shadows.laserEmerald,
            overflow: "hidden",
            width: "fit-content",
          }}
        >
          {/* Shimmer sweep */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${shimmerX}%`,
              width: "60%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)",
              transform: "skewX(-25deg)",
              pointerEvents: "none",
            }}
          />

          <span
            style={{
              color: "#05070E",
              fontSize: 16,
              fontWeight: 900,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            GET THE APP • START YOUR CONVOY
          </span>
        </div>
      </div>
    </div>
  );
};
