import { useScene, slotProps } from '../lib/scene.jsx'

/**
 * The project's extra components for one depth of the template:
 * cfg.scene.layers = [{ component: 'AdLibs.jsx', z: 'above-lyrics', props: {…} }].
 * Each gets the usual slot props plus its own "props".
 */
export function Layers({ z }) {
  const s = useScene()
  return (s.cfg.scene.layers ?? [])
    .filter((l) => (l.z ?? 'top') === z)
    .map((l, i) => {
      const C = s.track.component(l.component)
      return C ? <C key={`${z}-${i}`} {...slotProps(s)} {...l.props} /> : null
    })
}
