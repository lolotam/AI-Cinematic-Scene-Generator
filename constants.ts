import type { SelectOption } from './types';

export const ASPECT_RATIOS: SelectOption[] = [
  { value: "16:9", label: "16:9 (Widescreen)" },
  { value: "9:16", label: "9:16 (Vertical)" },
  { value: "1:1", label: "1:1 (Square)" },
  { value: "4:3", label: "4:3 (Classic TV)" },
  { value: "2.39:1", label: "2.39:1 (Cinemascope)" },
];

export const LIGHTING_STYLES: SelectOption[] = [
  { value: "natural morning light", label: "Morning Natural Light" },
  { value: "bright daylight", label: "Bright Daylight" },
  { value: "sunset / golden hour", label: "Sunset / Golden Hour" },
  { value: "night cinematic lighting", label: "Night Cinematic" },
  { value: "horror dim light", label: "Horror Dim Light" },
  { value: "neon cyberpunk lighting", label: "Neon Cyberpunk" },
  { value: "candlelight / firelight", label: "Candlelight / Firelight" },
  { value: "flashlight / single source dramatic lighting", label: "Flashlight / Dramatic" },
];

export const CAMERA_PERSPECTIVES: SelectOption[] = [
  { value: "close-up shot", label: "Close-up" },
  { value: "wide shot", label: "Wide Shot" },
  { value: "medium shot", label: "Medium Shot" },
  { value: "over-the-shoulder shot", label: "Over-the-shoulder" },
  { value: "overhead shot", label: "Overhead (Top-down)" },
  { value: "low-angle shot", label: "Low-angle" },
];

export const NUMBER_OF_IMAGES: SelectOption[] = [
  { value: "1", label: "1 Image" },
  { value: "2", label: "2 Images" },
  { value: "3", label: "3 Images" },
  { value: "4", label: "4 Images" },
];
