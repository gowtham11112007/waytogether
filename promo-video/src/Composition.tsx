import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { TOKENS } from "./tokens";
import { BackgroundEnvironment } from "./components/BackgroundEnvironment";
import { Scene1Hook } from "./scenes/Scene1Hook";
import { Scene2ConvoyNav } from "./scenes/Scene2ConvoyNav";
import { Scene3ConvoyHealth } from "./scenes/Scene3ConvoyHealth";
import { Scene4SyncAndSafety } from "./scenes/Scene4SyncAndSafety";
import { Scene5ClimaxOutro } from "./scenes/Scene5ClimaxOutro";

export const WayTogetherKeynotePromo: React.FC = () => {
  const frame = useCurrentFrame();

  // Dynamic global background color tone according to scene progression
  let bgGlow = TOKENS.colors.cyanPrimary;
  let showWarp = false;

  if (frame < 55) {
    bgGlow = frame < 30 ? TOKENS.colors.amberWarning : TOKENS.colors.cyanPrimary;
  } else if (frame < 125) {
    bgGlow = TOKENS.colors.cyanPrimary;
  } else if (frame < 185) {
    bgGlow = frame > 145 ? TOKENS.colors.amberWarning : TOKENS.colors.emeraldBright;
  } else if (frame < 245) {
    bgGlow = frame > 215 ? TOKENS.colors.crimsonEmergency : "#A855F7";
  } else {
    bgGlow = TOKENS.colors.emeraldBright;
    showWarp = true;
  }

  // Cinematic Flash Transition between acts
  const isTransitionCut =
    (frame >= 53 && frame <= 56) ||
    (frame >= 123 && frame <= 126) ||
    (frame >= 183 && frame <= 186) ||
    (frame >= 243 && frame <= 246);

  const flashOpacity = isTransitionCut ? 0.28 : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: TOKENS.colors.bgVoid,
        overflow: "hidden",
      }}
    >
      {/* Persistent Animated Background Environment */}
      <BackgroundEnvironment glowColor={bgGlow} showWarp={showWarp} />

      {/* Act 1: The Disconnect to Ignition (0.00s - 1.83s) */}
      <Sequence
        from={TOKENS.timing.scene1.start}
        durationInFrames={TOKENS.timing.scene1.duration}
        name="Act 1: The Hook"
      >
        <Scene1Hook />
      </Sequence>

      {/* Act 2: 3D Live Convoy & Telemetry (1.83s - 4.17s) */}
      <Sequence
        from={TOKENS.timing.scene2.start}
        durationInFrames={TOKENS.timing.scene2.duration}
        name="Act 2: 3D Live Nav"
      >
        <Scene2ConvoyNav />
      </Sequence>

      {/* Act 3: Convoy Health & Smart Reroute (4.17s - 6.17s) */}
      <Sequence
        from={TOKENS.timing.scene3.start}
        durationInFrames={TOKENS.timing.scene3.duration}
        name="Act 3: Convoy Health"
      >
        <Scene3ConvoyHealth />
      </Sequence>

      {/* Act 4: Synced Music & Instant SOS (6.17s - 8.17s) */}
      <Sequence
        from={TOKENS.timing.scene4.start}
        durationInFrames={TOKENS.timing.scene4.duration}
        name="Act 4: Sync & Safety"
      >
        <Scene4SyncAndSafety />
      </Sequence>

      {/* Act 5: Grand Keynote Climax & CTA (8.17s - 10.00s) */}
      <Sequence
        from={TOKENS.timing.scene5.start}
        durationInFrames={TOKENS.timing.scene5.duration}
        name="Act 5: Climax & CTA"
      >
        <Scene5ClimaxOutro />
      </Sequence>

      {/* Film Flash Glitch on Scene Cuts */}
      {flashOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: "#ffffff",
            opacity: flashOpacity,
            mixBlendMode: "overlay",
            pointerEvents: "none",
          }}
        />
      )}
    </AbsoluteFill>
  );
};
