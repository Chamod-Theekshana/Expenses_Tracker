import React from 'react';
import Svg, { Circle } from 'react-native-svg';

type CircularProgressProps = {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  progressColor: string;
};

export default function CircularProgress({
  percentage,
  size = 70,
  strokeWidth = 7,
  trackColor,
  progressColor,
}: CircularProgressProps) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const clampedPct = Math.max(0, Math.min(percentage, 100));
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={progressColor}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference}`}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="butt"
        rotation="-90"
        origin={`${cx}, ${cy}`}
      />
    </Svg>
  );
}
