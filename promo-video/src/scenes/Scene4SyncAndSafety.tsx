import React from "react";
import { interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TOKENS } from "../tokens";
import { DeviceMockup3D } from "../components/DeviceMockup3D";
import { KineticHUDOverlay } from "../components/KineticHUDOverlay";

export const Scene4SyncAndSafety: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase split: first 30 frames is Spotify Sync; next 30 frames is Emergency SOS!
  const isSosPhase = frame >= 28;

  // Springs for each phase
  const musicSpring = spring({
    frame,
    fps,
    config: TOKENS.springs.kineticSnap,
  });

  const sosSpring = spring({
    frame: frame - 28,
    fps,
    config: TOKENS.springs.emergencyStrobe,
  });

  // Device orientation
  const rotateY = !isSosPhase
    ? interpolate(musicSpring, [0, 1], [-6, -14])
    : interpolate(sosSpring, [0, 1], [-14, 16]);

  const rotateX = !isSosPhase ? 6 : -6;
  const scale = !isSosPhase ? 1.08 : 1.18;

  // Shockwave for SOS
  const shockProgress = isSosPhase ? ((frame - 28) % 18) / 18 : 0;
  const shockScale = interpolate(shockProgress, [0, 1], [0.6, 2.5]);
  const shockOpacity = interpolate(shockProgress, [0, 0.4, 1], [0.9, 0.5, 0]);

  // Audio equalizer bars
  const eqBars = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const val = 15 + 40 * Math.abs(Math.sin(frame * 0.35 + i * 1.1));
    return val;
  });

  const accentColor = !isSosPhase ? "#A855F7" : TOKENS.colors.crimsonEmergency;
  const currentScreenshot = !isSosPhase
    ? staticFile("screenshots/08_music_controls_playlist.png")
    : staticFile("screenshots/10_emergency_sos_screen.png");

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
        eyebrow={!isSosPhase ? "COLLECTIVE IN-TRIP ATMOSPHERE" : "CRITICAL INSTANT SAFETY"}
        titlePrimary={!isSosPhase ? "SYNCED BEATS." : "EMERGENCY SOS."}
        titleSecondary={!isSosPhase ? "SHARED PLAYLIST." : "INSTANT SIREN."}
        accentColor={accentColor}
        badgeText={
          !isSosPhase
            ? "SPOTIFY SYNCED • ONE PACE, ONE PLAYLIST"
            : "ACOUSTIC SIREN & CONVOY BROADCAST ALERT"
        }
      />

      {/* Floating Widget (Left HUD) */}
      {!isSosPhase ? (
        // Equalizer Widget
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 180,
            background: TOKENS.colors.bgCardGlass,
            padding: "20px 30px",
            borderRadius: 24,
            border: "1px solid rgba(168, 85, 247, 0.4)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 30px rgba(168, 85, 247, 0.25)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.2em",
              color: "#C084FC",
              fontWeight: 700,
            }}
          >
            SHARED SPOTIFY AUDIO STREAM
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 60 }}>
            {eqBars.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 10,
                  height: h,
                  borderRadius: 6,
                  background: "linear-gradient(to top, #7E22CE, #C084FC, #00F0FF)",
                  boxShadow: "0 0 10px #C084FC",
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        // SOS Beacon Widget
        <div
          style={{
            position: "absolute",
            left: 70,
            top: 180,
            background: "rgba(35, 10, 15, 0.8)",
            padding: "20px 30px",
            borderRadius: 24,
            border: "1px solid rgba(239, 68, 68, 0.6)",
            backdropFilter: "blur(20px)",
            boxShadow: TOKENS.shadows.laserCrimson,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 12,
              letterSpacing: "0.2em",
              color: TOKENS.colors.crimsonEmergency,
              fontWeight: 700,
            }}
          >
            HIGH-DECIBEL AUDIBLE BEACON
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              color: "#ffffff",
              fontFamily: "sans-serif",
            }}
          >
            110 dB SIREN ARMED
          </div>
          <div
            style={{
              fontSize: 13,
              color: "rgba(255, 255, 255, 0.7)",
              fontFamily: "monospace",
            }}
          >
            BROADCASTS INSTANT LAT/LON TO ALL CONVOY MEMBERS
          </div>
        </div>
      )}

      {/* 3D Device Stage */}
      <div
        style={{
          position: "absolute",
          right: "10%",
          top: "48%",
          transform: "translateY(-50%)",
        }}
      >
        {/* Shockwave Rings behind phone for SOS */}
        {isSosPhase && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: `translate(-50%, -50%) scale(${shockScale})`,
              width: 380,
              height: 380,
              borderRadius: "50%",
              border: `3px solid ${TOKENS.colors.crimsonEmergency}`,
              opacity: shockOpacity,
              boxShadow: TOKENS.shadows.laserCrimson,
              pointerEvents: "none",
            }}
          />
        )}

        <DeviceMockup3D
          screenshotSrc={currentScreenshot}
          rotateX={rotateX}
          rotateY={rotateY}
          rotateZ={isSosPhase ? 2 : -2}
          scale={scale}
          sheenProgress={interpolate(frame, [0, 60], [0.1, 0.9])}
          glowColor={accentColor}
        />
      </div>
    </div>
  );
};
