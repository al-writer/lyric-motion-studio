import { useScene } from '../../lib/scene.jsx'
import MediaTrack from '../../blocks/Media.jsx'
import { Film, Tint, VHS } from '../../blocks/Filters.jsx'
import Lyric, { TitleCard } from '../../blocks/Lyric.jsx'
import { Fade, Vignette } from '../../blocks/Scenery.jsx'
import { Spectrum } from '../../blocks/Reactive.jsx'
import { Layers } from '../../blocks/Layers.jsx'

// Footage: video clips or photos (Ken Burns) behind big lyric lines, with
// filters (grade, blur, vignette, film or VHS). The common YouTube lyric-video look.
export function Picture() {
  const { cfg } = useScene()
  const f = cfg.scene.filters
  const picture = <MediaTrack />
  return f.vhs ? <VHS {...(f.vhs === true ? {} : f.vhs)}>{picture}</VHS> : picture
}

export default function Footage() {
  const { cfg, dir } = useScene()
  const sc = cfg.scene
  const f = sc.filters
  const film = f.film === true ? {} : f.film
  return (
    <>
      <Picture />
      <Tint color={sc.tint} />
      <Layers z="background" />
      {film && <Film {...film} />}
      <Vignette amount={f.vignette} inner={45} />
      <Layers z="behind-hero" />
      {sc.titleCard?.show !== false && <TitleCard size={sc.titleCard.size} artistSize={sc.titleCard.artistSize} />}
      {dir.lyrics !== 'none' && <Lyric {...sc.lyrics} />}
      <Layers z="above-lyrics" />
      {(sc.spectrum.show || sc.spectrum.progress) && <Spectrum box={sc.spectrum.box} style={sc.spectrum.style} bars={sc.spectrum.show} progress={sc.spectrum.progress} />}
      <Layers z="top" />
      <Fade in={sc.fade.in} out={sc.fade.out} />
    </>
  )
}
