// Public API of the studio for project components: import { … } from 'lms'
//
//   hooks    useScene, useTime, useLyrics, useAudio, useMedia
//   blocks   backgrounds, filters, reactive, hero, text (see engine/src/blocks)
//   helpers  clamp, lerp, smooth, ramp, ease, bezier, rng, rgba, lineText, resolveTime,
//            timeline (resolveClips, clipsAt, sourceFrame, kenBurns)
export { useScene, useTime, useLyrics, useAudio, useMedia, SceneProvider, slotProps } from './scene.jsx'
export { clamp, lerp, mix, smooth, ramp, ease, bezier, rng, rgba } from './math.js'
export { lineText, lyricState, direct, resolveTime } from './lyrics.js'
export { hold, loadImage, settled } from './barrier.js'
export { projectUrl, mediaUrl } from './media.js'
export { fontsReady } from './track.js'

export { default as Palette } from '../blocks/Palette.jsx'
export { Motes, Grain, Vignette, Fade, DotGrid } from '../blocks/Scenery.jsx'
export { BassGlow, BeatRings, Spectrum } from '../blocks/Reactive.jsx'
export { default as Hero, Cover, HeroArt, heroSize } from '../blocks/Hero.jsx'
export { default as Wheel } from '../blocks/Wheel.jsx'
export { Words, lineStyle } from '../blocks/Words.jsx'
export { LineSwap, SingleLine, Caption, RISE_BLUR, SOFT_RISE } from '../blocks/Lines.jsx'
export { Layers } from '../blocks/Layers.jsx'
export { default as MediaTrack } from '../blocks/Media.jsx'
export { Film, VHS, Tint, cssFilter } from '../blocks/Filters.jsx'
export { default as Lyric, TitleCard, lineWindows } from '../blocks/Lyric.jsx'
export { resolveClips, clipsAt, sourceTime, sourceFrame, kenBurns, mediaKind } from './timeline.js'
