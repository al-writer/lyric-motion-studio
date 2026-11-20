// Render barrier: blocks that load something per frame (video frames,
// photos) register the promise here; tools/render.mjs waits for
// window.__lms.settled() after every step and only then takes the screenshot.
const pending = new Set()

export function hold(promise) {
  pending.add(promise)
  promise.finally(() => pending.delete(promise))
  return promise
}

export async function settled() {
  while (pending.size) await Promise.allSettled([...pending])
}

window.__lms = Object.assign(window.__lms ?? {}, { settled })

/** <img> that the renderer waits for until it is decoded */
export function loadImage(src) {
  return hold(
    new Promise((resolve, reject) => {
      const img = new Image()
      img.decoding = 'sync'
      img.onload = () => img.decode().then(() => resolve(img), () => resolve(img))
      img.onerror = () => reject(new Error(`cannot load ${src}`))
      img.src = src
    })
  )
}
