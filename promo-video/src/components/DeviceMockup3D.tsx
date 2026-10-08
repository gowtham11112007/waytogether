import React from "react";
import { Img, interpolate } from "remotion";
import { TOKENS } from "../tokens";

export interface DeviceMockup3DProps {
  screenshotSrc: string;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  translateZ?: number;
  translateX?: number;
  translateY?: number;
  scale?: number;
  sheenProgress?: number; // 0 to 1
  opacity?: number;
  width?: number;
  height?: number;
  glowColor?: string;
  children?: React.ReactNode;
}

export const DeviceMockup3D: React.FC<DeviceMockup3DProps> = ({
  screenshotSrc,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  translateZ = 0,
  translateX = 0,
  translateY = 0,
  scale = 1.0,
  sheenProgress = 0.5,
  opacity = 1.0,
  width = 380,
  height = 820,
  glowColor = TOKENS.colors.cyanPrimary,
  children,
}) => {
  const sheenTranslateX = interpolate(sheenProgress, [0, 1], [-180, 260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height,
        perspective: 1500,
        transformStyle: "preserve-3d",
        opacity,
        position: "relative",
      }}
    >
      {/* 3D Rotator */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
          transformStyle: "preserve-3d",
          transform: `
            translateX(${translateX}px)
            translateY(${translateY}px)
            translateZ(${translateZ}px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            rotateZ(${rotateZ}deg)
            scale(${scale})
          `,
          willChange: "transform",
        }}
      >
        {/* Contact Floor Shadow */}
        <div
          style={{
            position: "absolute",
            inset: 16,
            borderRadius: 54,
            background: "transparent",
            boxShadow: `
              0 45px 100px -15px rgba(0, 0, 0, 0.92),
              0 25px 50px -5px ${glowColor}33,
              0 80px 140px -30px rgba(0, 0, 0, 0.8)
            `,
            transform: "translateZ(-30px)",
            pointerEvents: "none",
          }}
        />

        {/* Outer Titanium Chassis */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 52,
            padding: 10,
            background: `
              linear-gradient(145deg, 
                #3A4454 0%, 
                #18202E 35%, 
                #0B1019 70%, 
                #283549 100%
              )
            `,
            boxShadow: `
              inset 0 1px 2px rgba(255, 255, 255, 0.4),
              inset 0 -1px 2px rgba(0, 0, 0, 0.8),
              0 0 0 1.5px rgba(255, 255, 255, 0.15),
              0 0 35px ${glowColor}2b
            `,
            position: "relative",
            transformStyle: "preserve-3d",
            boxSizing: "border-box",
          }}
        >
          {/* Side Buttons */}
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 130,
              width: 3,
              height: 46,
              borderRadius: "2px 0 0 2px",
              background: "#475569",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: -3,
              top: 190,
              width: 3,
              height: 46,
              borderRadius: "2px 0 0 2px",
              background: "#475569",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: -3,
              top: 160,
              width: 3,
              height: 70,
              borderRadius: "0 2px 2px 0",
              background: "#475569",
            }}
          />

          {/* Screen Bezel & Display Viewport */}
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 43,
              overflow: "hidden",
              position: "relative",
              background: "#000000",
              boxShadow: "inset 0 0 0 2px rgba(0, 0, 0, 0.95)",
            }}
          >
            {/* The Actual Screen Image */}
            <Img
              src={screenshotSrc}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />

            {/* Dynamic Island Notch */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                width: 108,
                height: 30,
                borderRadius: 18,
                backgroundColor: "#000000",
                zIndex: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: 12,
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.6)",
              }}
            >
              {/* Camera Lens Reflection Glint */}
              <div
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "radial-gradient(circle, #102A45 25%, #030712 85%)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              />
            </div>

            {/* Specular Light Sheen Reflection Sweep */}
            <div
              style={{
                position: "absolute",
                top: -120,
                left: `${sheenTranslateX}%`,
                width: "150%",
                height: "240%",
                background: `
                  linear-gradient(
                    118deg,
                    transparent 30%,
                    rgba(255, 255, 255, 0.04) 42%,
                    rgba(255, 255, 255, 0.28) 48%,
                    ${glowColor}33 50%,
                    rgba(255, 255, 255, 0.04) 54%,
                    transparent 66%
                  )
                `,
                transform: "rotate(18deg)",
                pointerEvents: "none",
                mixBlendMode: "screen",
                zIndex: 35,
              }}
            />

            {/* Inner Glass Vignette */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 43,
                boxShadow: "inset 0 0 16px rgba(0, 0, 0, 0.4)",
                pointerEvents: "none",
                zIndex: 36,
              }}
            />
          </div>
        </div>

        {/* Optional 3D Detached Children (e.g. Floating Telemetry Badges) */}
        {children}
      </div>
    </div>
  );
};
