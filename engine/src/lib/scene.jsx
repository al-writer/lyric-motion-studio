import { createContext, useContext, useMemo } from 'react'
import { direct, lyricState } from './lyrics.js'
import { H, VERTICAL, W } from './params.js'

// Everything a block or a project component needs for the current frame.
//   t         clock, s
//   track     loaded project (lines, audio, media, component(name), …)
//   cfg       resolved project.json for this format
//   W, H      stage size in CSS px; vertical
//   lyric     lyricState(): cur, line, next, section, gapAhead, ended, credits
//   dir       direction: pose, lyrics layout, inBreak, act (+ project director)
//   poster    true when drawing a still cover (thumbnails)
export const SceneContext = createContext(null)

export function useScene() {
  const s = useContext(SceneContext)
  if (!s) throw new Error('useScene() outside of a <SceneProvider>')
  return s
}
export const useTime = () => useScene().t
export const useLyrics = () => {
  const s = useScene()
  return { lines: s.track.lines, ...s.lyric }
}
export const useAudio = () => useScene().track.audio
export const useMedia = (id) => {
  const m = useScene().track.media[id]
  if (!m) throw new Error(`media "${id}" is not in project.json "media"`)
  return m
}

export function sceneState(track, t, poster = false) {
  const { cfg, lines } = track
  const lyric = lyricState(lines, t, cfg.lyrics)
  let dir = direct(lines, t, lyric, cfg.scene)
  if (track.director) dir = { ...dir, ...track.director({ t, lines, lyric, dir, cfg, audio: track.audio }) }
  return { t, track, cfg, W, H, vertical: VERTICAL, lyric, dir, poster }
}

export function SceneProvider({ track, t, poster = false, children }) {
  const value = useMemo(() => sceneState(track, t, poster), [track, t, poster])
  return <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
}

/** Props every project component receives (they can also call useScene()). */
export const slotProps = (s) => ({ t: s.t, track: s.track, cfg: s.cfg, W: s.W, H: s.H, vertical: s.vertical, section: s.lyric.section, cur: s.lyric.cur, poster: s.poster })
