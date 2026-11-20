import { describe, expect, it } from 'vitest'
import { checkStudioVersion, merge, resolveConfig } from '../engine/src/lib/config.js'

describe('merge', () => {
  it('merges objects key by key and replaces arrays and values', () => {
    expect(merge({ a: { b: 1, c: 2 }, l: [1, 2] }, { a: { c: 3 }, l: [9] })).toEqual({ a: { b: 1, c: 3 }, l: [9] })
  })
  it('does not share nested objects with its inputs', () => {
    const base = { a: { b: 1 } }
    const out = merge(base)
    out.a.b = 2
    expect(base.a.b).toBe(1)
  })
  it('lets null replace an object', () => {
    expect(merge({ a: { b: 1 } }, { a: null })).toEqual({ a: null })
  })
})

describe('resolveConfig', () => {
  const template = { defaults: { scene: { box: { left: 1, top: 2 } }, vertical: { scene: { box: { left: 10 } } } } }
  const project = { title: 'x', scene: { box: { top: 5 } }, vertical: { scene: { box: { top: 50 } } } }
  it('layers engine, template, template format, project, project format', () => {
    expect(resolveConfig(project, template, 'wide').scene.box).toEqual({ left: 1, top: 5 })
    expect(resolveConfig(project, template, 'vertical').scene.box).toEqual({ left: 10, top: 50 })
  })
  it('keeps engine defaults and drops format blocks and $schema', () => {
    const cfg = resolveConfig({ ...project, $schema: 'x' }, template, 'wide')
    expect(cfg.lyrics.lead).toBe(0.45)
    expect(cfg.vertical).toBeUndefined()
    expect(cfg.$schema).toBeUndefined()
  })
  it('applies overrides last', () => {
    expect(resolveConfig(project, template, 'wide', { lyrics: { highlight: 'line' } }).lyrics.highlight).toBe('line')
  })
})

describe('checkStudioVersion', () => {
  it('accepts the current major and rejects others', () => {
    expect(() => checkStudioVersion({ studio: '^1' })).not.toThrow()
    expect(() => checkStudioVersion({ studio: '1.4' })).not.toThrow()
    expect(() => checkStudioVersion({})).not.toThrow()
    expect(() => checkStudioVersion({ studio: '^2' })).toThrow(/studio \^2/)
  })
})
