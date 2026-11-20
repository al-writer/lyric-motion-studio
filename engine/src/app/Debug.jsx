import { useScene } from '../lib/scene.jsx'

// ?debug: outlines of every box in cfg.scene (anything with left/right/top…),
// hero poses as crosses, the Shorts UI zones in 9:16, and the current state.
const COLORS = ['#ff4d6d', '#4dd2ff', '#ffd24d', '#7dff4d', '#c44dff', '#ff9a4d']

function boxes(obj, path = 'scene', out = []) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return out
  const keys = Object.keys(obj)
  if (keys.some((k) => ['left', 'right', 'top', 'bottom'].includes(k)) && keys.every((k) => typeof obj[k] === 'number')) out.push([path, obj])
  else for (const k of keys) boxes(obj[k], `${path}.${k}`, out)
  return out
}

export default function Debug() {
  const { t, cfg, W, H, vertical, lyric, dir } = useScene()
  const label = { position: 'absolute', font: '600 18px monospace', padding: '2px 6px', color: '#000' }
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {boxes(cfg.scene).map(([name, b], i) => {
        const c = COLORS[i % COLORS.length]
        const style = { position: 'absolute', outline: `2px dashed ${c}`, ...b }
        if (b.height != null && b.bottom == null) style.bottom = undefined
        if (b.side != null) Object.assign(style, { left: b.side, right: b.side, height: 60, bottom: b.bottom })
        return (
          <div key={name} style={style}>
            <span style={{ ...label, background: c, top: 0, left: 0 }}>{name}</span>
          </div>
        )
      })}
      {Object.entries(cfg.scene.hero?.poses ?? {}).map(([name, p], i) => (
        <div key={name} style={{ position: 'absolute', left: W / 2 + p.x - 12, top: H / 2 + p.y - 12, width: 24, height: 24, border: '2px solid #fff', borderRadius: '50%' }}>
          <span style={{ ...label, background: '#fff', top: 26, left: 0 }}>{name}</span>
        </div>
      ))}
      {vertical && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 380, background: 'rgba(255,0,0,0.15)' }} />
          <div style={{ position: 'absolute', right: 0, top: 700, bottom: 380, width: 130, background: 'rgba(255,0,0,0.15)' }} />
        </>
      )}
      <div style={{ ...label, background: 'rgba(255,255,255,0.85)', left: 10, top: 10, whiteSpace: 'pre' }}>
        {`t ${t.toFixed(2)}  ${lyric.section}  cur ${lyric.cur}  pose ${dir.pose}  lyrics ${dir.lyrics}${dir.inBreak ? '  break' : ''}${dir.act ? `  act ${dir.act.from ?? dir.act.at}` : ''}`}
      </div>
    </div>
  )
}
