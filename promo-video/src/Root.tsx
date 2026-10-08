import React from "react";
import { Composition } from "remotion";
import { WayTogetherKeynotePromo } from "./Composition";
import { TOKENS } from "./tokens";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 16:9 Master Flagship Keynote Presentation Composition */}
      <Composition
        id="WayTogetherKeynotePromo"
        component={WayTogetherKeynotePromo}
        durationInFrames={TOKENS.timing.totalFrames}
        fps={TOKENS.timing.fps}
        width={1920}
        height={1080}
      />
    </>
  );
};
