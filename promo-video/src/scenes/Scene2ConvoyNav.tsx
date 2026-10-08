import React from "react";
import { Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TOKENS } from "../tokens";
import { DeviceMockup3D } from "../components/DeviceMockup3D";
import { KineticHUDOverlay } from "../components/KineticHUDOverlay";

export const Scene2ConvoyNav: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Whip transition spring
  const whipSpring = spring({
    frame,
    fps,
    config: TOKENS.springs.kineticSnap,
  });

  // Dynamic camera angle
  const rotateY = interpolate(whipSpring, [0, 1], [-8, 14]);
  const rotateX = interpolate(whipSpring, [0, 1], [6, -4]);
  const scale = interpolate(whipSpring, [0, 1], [1.02, 1.2]);
  const translateZ = interpolate(whipSpring, [0, 1], [0, 50]);

  // Subtle breathing float
  const floatY = Math.sin(frame * 0.08) * 3;

  // Dynamic Speedometer counter (24 -> 78 km/h)
  const speed = Math.floor(
    interpolate(frame, [0, 45], [24, 78], {
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  // Floating badges entrance
  const badgeSpring = spring({
    frame: frame - 10,
    fps,
    config: TOKENS.springs.badgeFloat,
  });
  const badgeTranslateX = interpolate(badgeSpring, [0, 1], [-40, 0]);
  const badgeOpacity = interpolate(badgeSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <KineticHUDOverlay
        eyebrow="GPU 3D MAPLIBRE ENGINE"
        titlePrimary="ZERO LATENCY."
        titleSecondary="3D LIVE CONVOY."
        accentColor={TOKENS.colors.cyanPrimary}
        badgeText="SUB-SECOND GLIDE // 60 FPS HEADING-UP"
      />

      {/* Floating Speed Telemetry Gauge (Left HUD) */}
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 180,
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          fontFamily: 'monospace, "SF Pro Display", sans-serif',
          background: TOKENS.colors.bgCardGlass,
          padding: "16px 28px",
          borderRadius: 24,
          border: "1px solid rgba(0, 240, 255, 0.3)",
          backdropFilter: "blur(20px)",
          boxShadow: TOKENS.shadows.hudCard,
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-0.04em",
          }}
        >
          {speed}
        </span>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: TOKENS.colors.cyanPrimary,
              letterSpacing: "0.1em",
            }}
          >
            KM/H
          </span>
          <span
            style={{
              fontSize: 12,
              color: TOKENS.colors.emeraldBright,
              letterSpacing: "0.12em",
            }}
          >
            LIVE GLIDE
          </span>
        </div>
      </div>

      {/* 3D Device Stage */}
      <div
        style={{
          position: "absolute",
          right: "10%",
          top: "48%",
          transform: "translateY(-50%)",
        }}
      >
        <DeviceMockup3D
          screenshotSrc={staticFile("screenshots/04_live_group_navigation_3d.png")}
          rotateX={rotateX}
          rotateY={rotateY}
          rotateZ={-1}
          translateZ={translateZ}
          translateY={floatY}
          scale={scale}
          sheenProgress={interpolate(frame, [0, 70], [0.2, 0.8])}
          glowColor={TOKENS.colors.cyanPrimary}
        >
          {/* 3D Detached Floating Telemetry Pill 1 */}
          <div
            style={{
              position: "absolute",
              top: 180,
              left: -130,
              transform: `translateZ(75px) translateX(${badgeTranslateX}px)`,
              opacity: badgeOpacity,
              background: "rgba(10, 16, 31, 0.88)",
              border: `1.5px solid ${TOKENS.colors.emeraldBright}`,
              borderRadius: 20,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: TOKENS.shadows.laserEmerald,
              whiteSpace: "nowrap",
              backdropFilter: "blur(16px)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: TOKENS.colors.emeraldBright,
                boxShadow: `0 0 10px ${TOKENS.colors.emeraldBright}`,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "monospace",
              }}
            >
              PRIYA NAIR • 560m AHEAD
            </span>
          </div>

          {/* 3D Detached Floating Telemetry Pill 2 */}
          <div
            style={{
              position: "absolute",
              bottom: 240,
              right: -110,
              transform: `translateZ(90px) translateX(${-badgeTranslateX}px)`,
              opacity: badgeOpacity,
              background: "rgba(10, 16, 31, 0.88)",
              border: `1.5px solid ${TOKENS.colors.cyanPrimary}`,
              borderRadius: 20,
              padding: "10px 18px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: TOKENS.shadows.laserCyan,
              whiteSpace: "nowrap",
              backdropFilter: "blur(16px)",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: TOKENS.colors.cyanPrimary,
                boxShadow: `0 0 10px ${TOKENS.colors.cyanPrimary}`,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "monospace",
              }}
            >
              4 RIDERS IN CONVOY FORMATION
            </span>
          </div>
        </DeviceMockup3D>
      </div>
    </div>
  );
};
