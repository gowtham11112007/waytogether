import React from "react";
import { interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TOKENS } from "../tokens";
import { DeviceMockup3D } from "../components/DeviceMockup3D";
import { KineticHUDOverlay } from "../components/KineticHUDOverlay";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const enterSpring = spring({
    frame,
    fps,
    config: TOKENS.springs.heroEntrance,
  });

  // Device 3D rotation and scale
  const rotateX = interpolate(enterSpring, [0, 1], [32, 6]);
  const rotateY = interpolate(enterSpring, [0, 1], [-26, -8]);
  const translateZ = interpolate(enterSpring, [0, 1], [-200, 20]);
  const scale = interpolate(enterSpring, [0, 1], [0.85, 1.02]);
  const deviceOpacity = interpolate(enterSpring, [0, 0.4, 1], [0, 1, 1]);

  // Subtle floating motion
  const floatX = Math.sin(frame * 0.08) * 1.5;
  const floatY = Math.cos(frame * 0.06) * 2;

  // Expanding radar scan rings
  const radarProgress = (frame % 28) / 28;
  const radarScale = interpolate(radarProgress, [0, 1], [0.4, 2.8]);
  const radarOpacity = interpolate(radarProgress, [0, 0.4, 1], [0.9, 0.6, 0]);

  // Kinetic typography sequence in Act 1
  let titlePrimary = "LOST CONVOY?";
  let titleSecondary = "STATIC MAPS DIE.";
  let eyebrow = "CONVOY PROTOCOL OFFLINE";
  let accentColor = TOKENS.colors.amberWarning;

  if (frame >= 25 && frame < 40) {
    titlePrimary = "UNTIL NOW.";
    titleSecondary = "SUB-SECOND SYNC.";
    eyebrow = "INITIALIZING REALTIME LINK";
    accentColor = TOKENS.colors.cyanPrimary;
  } else if (frame >= 40) {
    titlePrimary = "NEVER RIDE";
    titleSecondary = "ALONE.";
    eyebrow = "THE HIGH-VELOCITY HIVE-MIND";
    accentColor = TOKENS.colors.emeraldBright;
  }

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
      {/* HUD Overlay with kinetic typography */}
      <KineticHUDOverlay
        eyebrow={eyebrow}
        titlePrimary={titlePrimary}
        titleSecondary={titleSecondary}
        accentColor={accentColor}
        badgeText="CHANNEL: WAY-7824 // REALTIME CONNECTED"
      />

      {/* Floating 3D Device on the Right Stage */}
      <div
        style={{
          position: "absolute",
          right: "12%",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {/* Radar Rings Behind Device */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) scale(${radarScale})`,
            width: 320,
            height: 320,
            borderRadius: "50%",
            border: `2px solid ${accentColor}`,
            opacity: radarOpacity,
            boxShadow: `0 0 20px ${accentColor}`,
            pointerEvents: "none",
          }}
        />

        <DeviceMockup3D
          screenshotSrc={staticFile("screenshots/02_home_dashboard.png")}
          rotateX={rotateX + floatX}
          rotateY={rotateY + floatY}
          rotateZ={-2}
          translateZ={translateZ}
          scale={scale}
          opacity={deviceOpacity}
          sheenProgress={interpolate(frame, [0, 55], [0, 1])}
          glowColor={accentColor}
        />
      </div>
    </div>
  );
};
