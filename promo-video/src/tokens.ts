export const TOKENS = {
  colors: {
    bgVoid: "#05070E",
    bgSurface: "#0A101F",
    bgCardGlass: "rgba(13, 22, 41, 0.72)",
    cyanPrimary: "#00F0FF",
    cyanGlow: "#06B6D4",
    cyanSubtle: "rgba(6, 182, 212, 0.2)",
    emeraldPulse: "#10B981",
    emeraldBright: "#05F59B",
    emeraldSubtle: "rgba(16, 185, 129, 0.18)",
    amberWarning: "#F59E0B",
    amberGlow: "rgba(245, 158, 11, 0.4)",
    crimsonEmergency: "#EF4444",
    crimsonGlow: "rgba(239, 68, 68, 0.45)",
    textWhite: "#FFFFFF",
    textMuted: "#94A3B8",
    titaniumLight: "rgba(255, 255, 255, 0.85)",
    gridLines: "rgba(0, 240, 255, 0.08)",
  },
  shadows: {
    laserCyan: "0 0 24px rgba(0, 240, 255, 0.5), 0 0 64px rgba(6, 182, 212, 0.25)",
    laserEmerald: "0 0 20px rgba(5, 245, 155, 0.55), 0 0 60px rgba(16, 185, 129, 0.25)",
    laserCrimson: "0 0 32px rgba(239, 68, 68, 0.7), 0 0 90px rgba(239, 68, 68, 0.35)",
    laserAmber: "0 0 24px rgba(245, 158, 11, 0.6), 0 0 70px rgba(245, 158, 11, 0.3)",
    hudCard: "0 16px 40px -8px rgba(0, 0, 0, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.18)",
    deviceDrop3D: "0 45px 95px -15px rgba(0, 0, 0, 0.9), 0 20px 45px -5px rgba(0, 240, 255, 0.18)",
  },
  springs: {
    heroEntrance: { damping: 14, stiffness: 110, mass: 0.85 },
    kineticSnap: { damping: 18, stiffness: 175, mass: 0.65 },
    badgeFloat: { damping: 20, stiffness: 90, mass: 1.1 },
    emergencyStrobe: { damping: 8, stiffness: 240, mass: 0.45 },
  },
  timing: {
    fps: 30,
    totalFrames: 300, // 10.0s
    scene1: { start: 0, duration: 55 },   // 0.00s - 1.83s : Hook & The Ignition
    scene2: { start: 55, duration: 70 },  // 1.83s - 4.17s : 3D Live Convoy & Radar
    scene3: { start: 125, duration: 60 }, // 4.17s - 6.17s : Convoy Health & Telemetry
    scene4: { start: 185, duration: 60 }, // 6.17s - 8.17s : Audio Sync & SOS Shield
    scene5: { start: 245, duration: 55 }, // 8.17s - 10.0s : Grand Climax & Master CTA
  },
};
