import { useScene, slotProps } from '../../lib/scene.jsx'
import Palette from '../../blocks/Palette.jsx'
import Hero from '../../blocks/Hero.jsx'
import Wheel from '../../blocks/Wheel.jsx'
import { Caption, SingleLine } from '../../blocks/Lines.jsx'
import { DotGrid, Fade, Grain, Motes, Vignette } from '../../blocks/Scenery.jsx'
import { Spectrum } from '../../blocks/Reactive.jsx'
import { Layers } from '../../blocks/Layers.jsx'

// Illustrated: section palette, the project's backdrop, a hero object that
// moves between poses, a lyric wheel (or single line), audio-reactive bits.
export default function Illustrated() {
  const s = useScene()
  const { track, cfg, lyric, dir } = s
  const sc = cfg.scene
  const r = sc.reactive
  const Backdrop = track.component(sc.backdrop?.component)
  const hero = { ...sc.hero, glow: r.glow, tilt: r.tilt }
  return (
    <>
      <Palette />
      <Layers z="background" />
      {Backdrop && <Backdrop {...slotProps(s)} />}
      {r.dots && <DotGrid />}
      {r.motes && <Motes />}
      <Layers z="behind-hero" />
      <Hero hero={hero} rings={lyric.cur >= 0 && r.rings.includes(lyric.section)} />
      <Layers z="above-hero" />
      {dir.lyrics === 'caption' && <Caption box={sc.caption.box} size={sc.caption.size} />}
      {sc.lyrics.layout === 'single' ? (
        dir.lyrics !== 'caption' && <SingleLine box={sc.lyrics.box} {...sc.lyrics.single} />
      ) : (
        <Wheel box={sc.lyrics.box} wheel={sc.lyrics.wheel} visible={dir.lyrics === 'wheel' && !dir.inBreak} />
      )}
      <Layers z="above-lyrics" />
      <Vignette amount={sc.vignette} />
      <Grain opacity={sc.grain} />
      <Spectrum box={sc.spectrum.box} style={sc.spectrum.style} bars={sc.spectrum.show} />
      <Layers z="top" />
      <Fade in={sc.fade.in} out={sc.fade.out} />
    </>
  )
}
