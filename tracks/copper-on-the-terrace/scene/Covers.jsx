import { Railing, SKINS, Stack, Sun, Sunburst } from './Poster.jsx'

// YouTube / Shorts covers in the video's own look: one big kinetic-type stack,
// the striped sun, the terrace railing and a handwritten note with a pen
// swoosh. Variants come from scene.json "covers.variants":
//   { "skin": "verse|pre|chorus|bridge|outro", "line": "...", "note": "...", "tag": "..." }
// Rendered with: node tools/render.mjs --track copper-on-the-terrace --thumbnail title,rust,...
// (add --format vertical for 1080x1920 Shorts covers). 16:9 keeps text out of
// the bottom-right corner, where YouTube draws the duration; 9:16 keeps it in
// the middle 3:4 that profile grids show.

export default function Covers({ track, variant, W, H }) {
  const vertical = H > W
  const { scene } = track
  const v = scene.covers.variants[variant] ?? Object.values(scene.covers.variants)[0]
  const skin = SKINS[v.skin ?? 'verse']
  const fonts = scene.fonts
  const words = v.line.split(/\s+/).map((w) => ({ w, t: -10, e: -9.5 }))

  const box = vertical ? { x: 80, y: 330, w: 920, h: 820, maxSize: 300 } : { x: 100, y: 120, w: 1120, h: 640, maxSize: 330 }
  const sun = vertical ? { cx: 540, cy: 1500, r: 330 } : { cx: 1540, cy: 560, r: 300 }
  const note = vertical ? { x: 130, y: 1190, size: 92 } : { x: 120, y: 800, size: 74 }
  const noteColor = skin.adlib ?? skin.accent

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: skin.bg }}>
      <Sunburst cx={sun.cx} cy={sun.cy} t={3} on={v.skin === 'chorus'} color="rgba(255,214,150,0.24)" />
      <div style={{ position: 'absolute', inset: 0, opacity: skin.sun }}>
        <Sun cx={sun.cx} cy={sun.cy} r={sun.r} t={0} glow={0.9} />
      </div>
      <Railing W={W} H={H} vertical={vertical} />

      <div
        style={{
          position: 'absolute',
          left: box.x,
          right: box.x,
          top: vertical ? 210 : 60,
          display: 'flex',
          justifyContent: 'space-between',
          fontFamily: "'Space Mono', monospace",
          fontSize: vertical ? 30 : 28,
          letterSpacing: '0.32em',
          color: skin.ink,
          opacity: 0.8,
        }}
      >
        <span>{scene.artist.toUpperCase()}</span>
        <span>{(v.tag ?? 'Lyric video').toUpperCase()}</span>
      </div>

      <Stack words={words} t={0} enter={-10} exitAt={Infinity} skin={skin} fonts={fonts} box={box} align="center" />

      {v.note && (
        <div style={{ position: 'absolute', left: note.x, top: note.y, transform: 'rotate(-7deg)', transformOrigin: '0 50%', whiteSpace: 'nowrap' }}>
          <div style={{ fontFamily: `'${fonts.hand}', cursive`, fontWeight: 600, fontSize: note.size, lineHeight: 1, color: noteColor }}>{v.note}</div>
          <svg width={note.size * 5.5} height={note.size * 0.4} viewBox="0 0 600 40" preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
            <path d="M6 28 C 150 6, 330 6, 590 18" fill="none" stroke={noteColor} strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}
