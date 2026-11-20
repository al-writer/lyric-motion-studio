import { useScene, slotProps } from '../../lib/scene.jsx'
import { Fade, Grain } from '../../blocks/Scenery.jsx'
import { Layers } from '../../blocks/Layers.jsx'

// Custom: the project draws the whole frame itself with
// "scene": { "component": "Poster.jsx" }; the engine adds grain, the project's
// extra layers and the fade to black. Its thumbnails come from
// "thumbnails": { "component": "Covers.jsx", "variants": {…} }.
function Scene() {
  const s = useScene()
  const sc = s.cfg.scene
  const Stage = s.track.component(sc.component)
  if (!Stage) throw new Error('template "custom" needs "scene": { "component": "X.jsx" }')
  return (
    <>
      <Stage {...slotProps(s)} />
      <Layers z="above-lyrics" />
      <Grain opacity={sc.grain} />
      <Layers z="top" />
      <Fade in={sc.fade.in} out={sc.fade.out} />
    </>
  )
}

const defaults = { scene: { component: null, grain: 0.09, fade: { in: 1.5, out: 2.5 }, layers: [] } }

export default { name: 'custom', Scene, Thumbnail: null, defaults }
