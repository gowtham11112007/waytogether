import React from "react";
import { interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TOKENS } from "../tokens";
import { DeviceMockup3D } from "../components/DeviceMockup3D";
import { KineticHUDOverlay } from "../components/KineticHUDOverlay";

export const Scene3ConvoyHealth: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const enterSpring = spring({
    frame,
    fps,
    config: TOKENS.springs.kineticSnap,
  });

  const rotateX = interpolate(enterSpring, [0, 1], [-4, -10]);
  const rotateY = interpolate(enterSpring, [0, 1], [14, -6]);
  const scale = interpolate(enterSpring, [0, 1], [1.2, 1.12]);

  // Amber warning pulse triggering after frame 18
  const isAlertPhase = frame > 18;
  const alertPulse = isAlertPhase ? Math.sin((frame - 18) * 0.45) : 0;
  const accentColor = isAlertPhase ? TOKENS.colors.amberWarning : TOKENS.colors.emeraldBright;

  // Floating heartbeat
  const heartbeat = Math.sin((frame * Math.PI) / 12);
  const glowIntensity = isAlertPhase
    ? interpolate(Math.abs(alertPulse), [0, 1], [0.3, 0.9])
    : interpolate(Math.abs(heartbeat), [0, 1], [0.3, 0.7]);

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
        eyebrow="AUTONOMOUS PACK GUARDIAN"
        titlePrimary="CONVOY HEALTH."
        titleSecondary={isAlertPhase ? "AUTO-TRIAGE ACTIVE." : "ALL RIDERS IN SYNC."}
        accentColor={accentColor}
        badgeText={
          isAlertPhase
            ? "ALERT: RIDER DIVERGENCE DETECTED • AUTO-ALERT SENT"
            : "BATTERY & ROUTE MONITORED // 100% HEALTHY"
        }
      />

      {/* Health Matrix Status Widget (Left HUD) */}
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 170,
          background: TOKENS.colors.bgCardGlass,
          padding: "20px 28px",
          borderRadius: 24,
          border: `1px solid ${accentColor}55`,
          backdropFilter: "blur(20px)",
          boxShadow: isAlertPhase ? TOKENS.shadows.laserAmber : TOKENS.shadows.laserEmerald,
          maxWidth: 420,
        }}
      >
        <div
          style={{
            fontFamily: "monospace",
            fontSize: 12,
            letterSpacing: "0.2em",
            color: accentColor,
            marginBottom: 12,
            fontWeight: 700,
          }}
        >
          {isAlertPhase ? "TRIAGE // WARNING RECTIFIED" : "CONVOY HEALTH MATRIX"}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
              color: "#ffffff",
              fontFamily: "sans-serif",
              fontWeight: 600,
            }}
          >
            <span>Arjun Sharma</span>
            <span
              style={{
                color: isAlertPhase ? TOKENS.colors.amberWarning : TOKENS.colors.emeraldBright,
                fontFamily: "monospace",
              }}
            >
              {isAlertPhase ? "OFF-ROUTE (REVERTING)" : "ON ROUTE"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
              color: "#ffffff",
              fontFamily: "sans-serif",
              fontWeight: 600,
            }}
          >
            <span>Priya Nair</span>
            <span style={{ color: TOKENS.colors.emeraldBright, fontFamily: "monospace" }}>
              +560m // 98% BATT
            </span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 14,
              color: "#ffffff",
              fontFamily: "sans-serif",
              fontWeight: 600,
            }}
          >
            <span>Vikram Das</span>
            <span style={{ color: TOKENS.colors.emeraldBright, fontFamily: "monospace" }}>
              SWEEP // OK
            </span>
          </div>
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
          screenshotSrc={staticFile("screenshots/05_convoy_health_sheet.png")}
          rotateX={rotateX}
          rotateY={rotateY}
          rotateZ={1}
          translateZ={30}
          scale={scale}
          sheenProgress={interpolate(frame, [0, 60], [0.3, 0.7])}
          glowColor={accentColor}
        >
          {/* Warning Halo if alert is triggered */}
          {isAlertPhase && (
            <div
              style={{
                position: "absolute",
                inset: -20,
                borderRadius: 65,
                border: `2px solid ${TOKENS.colors.amberWarning}`,
                boxShadow: `0 0 40px ${TOKENS.colors.amberWarning}`,
                opacity: glowIntensity,
                pointerEvents: "none",
                transform: "translateZ(40px)",
              }}
            />
          )}
        </DeviceMockup3D>
      </div>
    </div>
  );
};
