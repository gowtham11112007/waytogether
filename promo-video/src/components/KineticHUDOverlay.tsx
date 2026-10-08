import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { TOKENS } from "../tokens";

export interface KineticHUDOverlayProps {
  eyebrow?: string;
  titlePrimary: string;
  titleSecondary?: string;
  accentColor?: string;
  badgeText?: string;
  showTimeline?: boolean;
}

export const KineticHUDOverlay: React.FC<KineticHUDOverlayProps> = ({
  eyebrow,
  titlePrimary,
  titleSecondary,
  accentColor = TOKENS.colors.cyanPrimary,
  badgeText,
  showTimeline = true,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Progress timecode
  const progressRatio = Math.min(frame / durationInFrames, 1);
  const currentSeconds = (frame / fps).toFixed(2);

  // Staggered title spring animation
  const titleSpring = spring({
    frame,
    fps,
    config: TOKENS.springs.heroEntrance,
  });

  const titleTranslateY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Plus Jakarta Sans", sans-serif',
      }}
    >
      {/* Top 10-Second Keynote Scrubber */}
      {showTimeline && (
        <div
          style={{
            position: "absolute",
            top: 24,
            left: 50,
            right: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          {/* Timeline Bar */}
          <div
            style={{
              flex: 1,
              height: 3,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: 2,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                width: `${progressRatio * 100}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${TOKENS.colors.cyanPrimary}, ${TOKENS.colors.emeraldBright})`,
                boxShadow: `0 0 10px ${TOKENS.colors.cyanPrimary}`,
              }}
            />
          </div>

          {/* Timecode & Live Beacon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 13,
              fontFamily: "monospace",
              color: "rgba(255, 255, 255, 0.8)",
              letterSpacing: "0.1em",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: TOKENS.colors.emeraldPulse,
                boxShadow: `0 0 8px ${TOKENS.colors.emeraldPulse}`,
                opacity: (frame % 16 < 8) ? 1 : 0.4,
              }}
            />
            <span>00:{currentSeconds.padStart(5, "0")} / 00:10.00</span>
          </div>
        </div>
      )}

      {/* Cockpit HUD Brackets */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 50,
          fontFamily: "monospace",
          fontSize: 12,
          letterSpacing: "0.18em",
          color: TOKENS.colors.textMuted,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: accentColor }}>[</span>
        <span style={{ color: "#ffffff" }}>WAYTOGETHER</span>
        <span>//</span>
        <span style={{ color: accentColor }}>LIVE CONVOY TELEMETRY</span>
        <span style={{ color: accentColor }}>]</span>
      </div>

      <div
        style={{
          position: "absolute",
          top: 50,
          right: 50,
          fontFamily: "monospace",
          fontSize: 12,
          letterSpacing: "0.18em",
          color: TOKENS.colors.textMuted,
        }}
      >
        <span>BROADCAST FREQ: </span>
        <span style={{ color: TOKENS.colors.emeraldBright, fontWeight: "bold" }}>
          3.0s DIRECT
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          left: 50,
          fontFamily: "monospace",
          fontSize: 12,
          letterSpacing: "0.18em",
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <span>STATUS: </span>
        <span style={{ color: TOKENS.colors.cyanPrimary }}>ONLINE CONVOY ACTIVE</span>
        <span style={{ marginLeft: 16 }}>LATENCY: </span>
        <span style={{ color: TOKENS.colors.emeraldBright }}>0.00s ZERO-DB</span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 40,
          right: 50,
          fontFamily: "monospace",
          fontSize: 12,
          letterSpacing: "0.18em",
          color: "rgba(255, 255, 255, 0.5)",
        }}
      >
        <span>CH: </span>
        <span style={{ color: "#ffffff" }}>#WAY-7824</span>
        <span style={{ marginLeft: 16 }}>RIDERS: </span>
        <span style={{ color: TOKENS.colors.cyanPrimary }}>4 SYNCED</span>
      </div>

      {/* Main Kinetic Typography Banner (Bottom or Left Anchor) */}
      <div
        style={{
          position: "absolute",
          left: 70,
          bottom: 120,
          maxWidth: 820,
          transform: `translateY(${titleTranslateY}px)`,
          opacity: titleOpacity,
        }}
      >
        {eyebrow && (
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.25em",
              color: accentColor,
              textTransform: "uppercase",
              marginBottom: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 24,
                height: 2,
                backgroundColor: accentColor,
                boxShadow: `0 0 8px ${accentColor}`,
              }}
            />
            {eyebrow}
          </div>
        )}

        <h1
          style={{
            margin: 0,
            fontSize: 68,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.04em",
            color: "#ffffff",
            textTransform: "uppercase",
            textShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
          }}
        >
          {titlePrimary}
        </h1>

        {titleSecondary && (
          <h2
            style={{
              margin: "6px 0 0 0",
              fontSize: 52,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              background: `linear-gradient(135deg, #ffffff 20%, ${accentColor} 90%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textTransform: "uppercase",
            }}
          >
            {titleSecondary}
          </h2>
        )}

        {badgeText && (
          <div
            style={{
              marginTop: 16,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 20,
              backgroundColor: "rgba(13, 22, 41, 0.75)",
              border: `1px solid ${accentColor}55`,
              backdropFilter: "blur(12px)",
              fontSize: 13,
              fontWeight: 600,
              color: "#ffffff",
              boxShadow: `0 0 16px ${accentColor}33`,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: accentColor,
                boxShadow: `0 0 6px ${accentColor}`,
              }}
            />
            {badgeText}
          </div>
        )}
      </div>
    </div>
  );
};
