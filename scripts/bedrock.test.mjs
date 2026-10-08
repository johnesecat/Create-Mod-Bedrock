import { readFileSync } from 'node:fs'
import { parse } from 'acorn'
import { describe, expect, it, vi } from 'vitest'
import { getBlockHardness, isUnbreakable } from '../Create (BE)/scripts/create/andrielScripts/xZDefinitions.js'
import { guardVisualEntitiesFromFishing } from '../Create (BE)/scripts/create/racoScripts/visualEntityGuard.js'

const BEARING_FILE = 'create/andrielScripts/blocks/mechanicalBearing.js'
const WINDMILL_FILE = 'create/andrielScripts/blocks/windmillBearing.js'
const DRILL_FILE = 'create/andrielScripts/blocks/mechanicalDrill.js'

function loadFunction(file, name, globals = {}) {
  const text = readFileSync(new URL('../Create (BE)/scripts/' + file, import.meta.url), 'utf8')
  const ast = parse(text, { ecmaVersion: 'latest', sourceType: 'module' })
  const node = ast.body.map((node) => node.declaration ?? node).find((node) => node.type === 'FunctionDeclaration' && node.id.name === name)
  if (!node) throw new Error(`Missing function: ${name}`)
  return new Function(...Object.keys(globals), `return (${text.slice(node.start, node.end)})`)(...Object.values(globals))
}

describe('Custom machine UI regression checks (not Minecraft rendering)', () => {
  const resourceJson = name => JSON.parse(readFileSync(new URL('../Create (RE)/' + name, import.meta.url), 'utf8').replace(/^\uFEFF/, ''))

  it('extends server forms without replacing vanilla cancel mappings or screen animations', () => {
    const form = resourceJson('ui/server_form.json')
    expect(form.namespace).toBe('server_form')
    expect(form['third_party_server_screen@common.base_screen']).toBeUndefined()
    const factories = form.main_screen_content.modifications[0].value
    expect(factories).toHaveLength(2)
    expect(form.custom_form.modifications[0].value.at(-1).source_property_name).toContain('create:rpm.')
    expect(form.custom_form.modifications[0].value.at(-1).source_property_name).toContain('create:funnel.')
  })

  it.each(['rpm', 'funnel'])('keeps %s forms responsive and retains every supported control type', name => {
    const screen = resourceJson(`ui/create/${name}_screen.json`)
    const panel = screen[`${name}_main_panel`].controls[0].panel
    expect(panel.size).toEqual(['90%', '100%c + 36px'])
    expect(panel.max_size).toEqual([400, '90%'])
    const content = screen[`${name}_screen_content`].controls[0].content
    expect(content.orientation).toBe('vertical')
    expect(content.size[1]).toBe('100%c')
    expect(Object.keys(content.factory.control_ids).sort()).toEqual(['divider', 'dropdown', 'header', 'input', 'label', 'slider', 'step_slider', 'toggle'].sort())
    expect(content.factory.control_ids.toggle).toBe('@server_form.custom_toggle')
    expect(content.factory.control_ids.slider).toBe('@server_form.custom_slider')
    const submit = screen[`${name}_screen_content`].controls[1]['submit_button@common_create.create_button']
    expect(submit.$pressed_button_name).toBe('button.submit_custom_form')
    expect(submit.size[1]).toBe(28)
  })

  it.each([0, NaN, Infinity, '64', -512, 128])('opens speed controller with a bounded numeric default for %s', stored => {
    const calls = {}
    class ModalFormData {
      title(value) { calls.title = value }
      toggle(_label, options) { calls.toggle = options }
      slider(label, min, max, options) { calls.slider = { label, min, max, options } }
      submitButton(value) { calls.submit = value }
      show() { return Promise.resolve({ canceled: true }) }
    }
    const entity = { getDynamicProperty: () => stored, getProperty: () => stored }
    loadFunction('create/andrielScripts/blocks/rpmConductors.js', 'speedControllerInteract', { ModalFormData })(
      {}, { typeId: 'create:rotation_speed_controller', location: {}, center: () => ({}) }, { getEntities: () => [entity] },
    )
    expect(calls.title).toEqual({ rawtext: [{ text: 'create:rpm.' }, { translate: 'speed_controller.title' }] })
    expect(calls.slider.label).toEqual({ translate: 'creative_motor.speed.text' })
    expect(calls.slider.options.defaultValue).toBe(typeof stored === 'number' && Number.isFinite(stored) ? Math.max(1, Math.min(256, Math.abs(stored))) : 1)
    expect(calls.submit).toEqual({ translate: 'creative_motor.confirm.text' })
  })

  it.each([
    { canceled: true }, { canceled: false },
    { canceled: false, formValues: ['true', 32] },
    { canceled: false, formValues: [true, NaN] },
    { canceled: false, formValues: [true, 0] },
    { canceled: false, formValues: [true, 65] },
    { canceled: false, formValues: [true, 32] },
    { canceled: false, formValues: [false, 64] },
  ])('preserves funnel settings for invalid responses and applies valid responses: %j', async response => {
    const entity = { isValid: true, setDynamicProperty: vi.fn() }
    const block = { typeId: 'create:brass_funnel', location: {}, center: () => ({}) }
    block.dimension = { getBlock: () => block }
    class ModalFormData {
      title() {} toggle() {} slider() {} submitButton() {}
      show() { return Promise.resolve(response) }
    }
    loadFunction('create/racoScripts/blocks/brassFunnel.js', 'showBrassFunnelAmountMenu', {
      ModalFormData, getFunnelEntity: () => entity, getExtractionSettings: () => ({ exact: false, amount: 1 }),
    })(block, { playSound: vi.fn() })
    await new Promise(resolve => setImmediate(resolve))
    const valid = !response.canceled && typeof response.formValues?.[0] === 'boolean' && Number.isFinite(response.formValues?.[1]) && response.formValues[1] >= 1 && response.formValues[1] <= 64
    if (valid) {
      expect(entity.setDynamicProperty).toHaveBeenCalledWith('create:brass_funnel_extract_exact', response.formValues[0])
      expect(entity.setDynamicProperty).toHaveBeenCalledWith('create:brass_funnel_extract_amount', response.formValues[1])
    } else expect(entity.setDynamicProperty).not.toHaveBeenCalled()
  })

  it.each(['en_US', 'zh_CN', 'pt_BR'])('includes localized form titles, labels, and submit text in %s', locale => {
    const text = readFileSync(new URL(`../Create (RE)/texts/${locale}.lang`, import.meta.url), 'utf8')
    for (const key of ['creative_motor.title', 'speed_controller.title', 'creative_motor.speed.text', 'creative_motor.reverse_rotation.text', 'creative_motor.confirm.text', 'create.ui.funnel.title', 'create.ui.funnel.exact', 'create.ui.funnel.amount']) {
      expect(text.split(/\r?\n/).filter(line => line.startsWith(key + '='))).toHaveLength(1)
    }
  })
})

describe('Bearing regression checks (isolated functions, not Minecraft)', () => {
  it.each([
    ['create:mechanical_bearing', 64, 64],
    ['create:mechanical_bearing', -32, -32],
    ['create:windmill_bearing', 4, 16],
    ['create:windmill_bearing', -4, -16],
    ['create:windmill_bearing', 0, 0],
  ])('integrates the actual bearing identity: %s at %s RPM', (typeId, rpm, visualRpm) => {
    const properties = new Map([['tick', 10], ['rpm', rpm], ['angle', 30]])
    const bearing = { x: 1, y: 2, z: 3, typeId, face: 'south' }
    const setAngle = vi.fn()
    const visual = loadFunction(BEARING_FILE, 'getVisualRpmForBearing', {
      WINDMILL_BEARING_BLOCK: 'create:windmill_bearing', WINDMILL_VISUAL_RPM: 16,
      hasRpm: loadFunction(BEARING_FILE, 'hasRpm', { RPM_EPSILON: 0.001 }),
    })
    const angle = loadFunction(BEARING_FILE, 'getBearingVisualAngle', {
      system: { currentTick: 15 },
      world: { getDynamicProperty: key => properties.get(key), setDynamicProperty: (key, value) => properties.set(key, value) },
      bearingLastTickKey: () => 'tick', bearingLastRpmKey: () => 'rpm', bearingAngleKey: () => 'angle',
      BEARING_ROTATION_SPEED: 0.3, getVisualRpmForBearing: visual, setBearingAngle: setAngle,
    })(bearing, rpm)
    expect(angle).toBeCloseTo((30 + 5 * 0.3 * visualRpm) % 360)
    expect(setAngle).toHaveBeenCalledWith(bearing, angle)
    expect(properties.get('tick')).toBe(15)
    expect(properties.get('rpm')).toBe(rpm)
  })

  it.each([[true, true], [false, false]])('treats powered=%s as authoritative over stale active=%s', (powered, staleActive) => {
    const states = { 'create:powered': powered, 'create:active_generator': staleActive, 'create:is_spinning': false }
    const block = { isValid: true, typeId: 'create:windmill_bearing' }
    const stats = vi.fn(() => ({ rpm: 2, stressCapacity: 512 }))
    const rpmUpdate = vi.fn()
    const tick = loadFunction(WINDMILL_FILE, 'windmillBearingTick', {
      WINDMILL_BEARING_BLOCK: block.typeId, getBlockState: (_block, key) => states[key],
      getWindmillStats: stats, setWindmillBearingRpm: rpmUpdate,
      updateBlockStates: (_block, updates) => Object.assign(states, updates),
      shouldRefreshContraption: () => true, bearingContraptionRpmUpdate: vi.fn(), refreshWindmillNetwork: vi.fn(),
    })
    expect(tick(block, {})).toBe(!powered)
    expect(states['create:active_generator']).toBe(!powered)
    expect(rpmUpdate).toHaveBeenCalledWith(block, powered ? 0 : 2, powered ? 0 : 512)
    expect(stats).toHaveBeenCalledTimes(powered ? 0 : 1)
  })

  it('preserves assembled windmills during a transient zero sail count', () => {
    const states = { 'create:powered': false, 'create:active_generator': true, 'create:is_spinning': true }
    const refresh = vi.fn()
    const update = vi.fn()
    const tick = loadFunction(WINDMILL_FILE, 'windmillBearingTick', {
      WINDMILL_BEARING_BLOCK: 'create:windmill_bearing', getBlockState: (_block, key) => states[key],
      getWindmillStats: () => ({ rpm: 0, stressCapacity: 0 }), setWindmillBearingRpm: vi.fn(),
      updateBlockStates: update, shouldRefreshContraption: () => true,
      bearingContraptionRpmUpdate: refresh, refreshWindmillNetwork: vi.fn(),
    })
    expect(tick({ isValid: true, typeId: 'create:windmill_bearing' }, {})).toBe(true)
    expect(refresh).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
  })

  it.each([true, false])('toggles windmills from powered=%s using the equipment enum', powered => {
    const setEnabled = vi.fn()
    const getEquipment = vi.fn(() => ({ typeId: 'create:wrench' }))
    const block = { isValid: true, typeId: 'create:windmill_bearing', center: () => ({}) }
    const interact = loadFunction(WINDMILL_FILE, 'windmillBearingInteract', {
      WINDMILL_BEARING_BLOCK: block.typeId, EquipmentSlot: { Mainhand: 'enum-mainhand' },
      getBlockState: () => powered, setWindmillBearingEnabled: setEnabled,
      system: { runJob: vi.fn() }, recalculateNetwork: vi.fn(),
    })
    expect(interact({ getComponent: () => ({ getEquipment }), playSound: vi.fn() }, block, {})).toBe(true)
    expect(getEquipment).toHaveBeenCalledWith('enum-mainhand')
    expect(setEnabled).toHaveBeenCalledWith(block, powered)
  })

  it('preserves unrelated states when updating custom windmill states', () => {
    const resolve = vi.fn(() => ({ updated: true }))
    const block = { typeId: 'create:windmill_bearing', permutation: { getAllStates: () => ({ 'minecraft:cardinal_direction': 'west', 'create:powered': false }) }, setPermutation: vi.fn() }
    const update = loadFunction(WINDMILL_FILE, 'updateBlockStates', { BlockPermutation: { resolve } })
    expect(update(block, { 'create:powered': true })).toBe(true)
    expect(resolve).toHaveBeenCalledWith(block.typeId, { 'minecraft:cardinal_direction': 'west', 'create:powered': true })
    expect(block.setPermutation).toHaveBeenCalledWith({ updated: true })
  })
})

describe('Mechanical drill regression checks (isolated functions, not Minecraft)', () => {
  it('resolves all supported drill directions and rejects invalid states', () => {
    const offsets = { north: { z: -1 }, south: { z: 1 }, east: { x: 1 }, west: { x: -1 }, above: { y: 1 }, below: { y: -1 } }
    const forward = loadFunction(DRILL_FILE, 'getDrillForward', {
      DIRECTION_OFFSETS: offsets, INVERT_FACE: { north: 'south', south: 'north', east: 'west', west: 'east', up: 'down', down: 'up' },
    })
    for (const [rotation, face] of Object.entries({ north: 'south', south: 'north', east: 'west', west: 'east', up: 'below', down: 'above' })) {
      expect(forward(rotation)).toBe(offsets[face])
    }
    for (const invalid of [undefined, 2, true, 'invalid']) expect(forward(invalid)).toBeUndefined()
  })

  it.each([0, undefined])('makes finite stationary drill progress with hardness=%s', hardness => {
    const data = new Map()
    const target = { isValid: true, typeId: 'create:custom_block', center: () => ({}) }
    const dimension = { getEntities: () => [{ getProperty: () => 100 }], playSound: vi.fn(), runCommand: vi.fn() }
    const tick = loadFunction(DRILL_FILE, 'mechanicalDrillTick', {
      drillData: data, posToKey: () => 'drill', mechanicalDrillDeleteData: vi.fn(),
      getDrillForward: () => ({ x: 0, y: 1, z: 0 }), canBreak: () => true,
      getBlockHardness: () => hardness, spawnCrackParticles: vi.fn(),
    })
    tick({ center: () => ({}), permutation: { getAllStates: () => ({ 'minecraft:facing_direction': 'up' }) }, offset: () => target }, dimension)
    expect(Number.isFinite(data.get('drill').destroyProgress)).toBe(true)
    expect(Number.isFinite(data.get('drill').ticksUntilNext)).toBe(true)
    expect(data.get('drill').destroyProgress).toBeGreaterThanOrEqual(0)
  })

  it('retains drill progress and does not collect drops when a break command fails', () => {
    const data = { destroyProgress: 9, ticksUntilNext: 0, breakingBlockId: 'minecraft:stone', breakingBlockKey: '1,2,3' }
    const schedule = vi.fn()
    const tick = loadFunction(DRILL_FILE, 'mechanicalDrillEntityTick', {
      drillData: new Map([['drill', data]]), getEntityDrillKey: () => 'drill',
      getEntityDrillTarget: () => ({ isValid: true, typeId: 'minecraft:stone', x: 1, y: 2, z: 3 }),
      canBreak: () => true, getBlockHardness: () => 1, spawnCrackParticles: vi.fn(),
      scheduleEntityDrillDropCollection: schedule,
    })
    expect(tick({ isValid: true, getProperty: () => 256, dimension: { runCommand: () => { throw new Error('unloaded') } } })).toBe(true)
    expect(schedule).not.toHaveBeenCalled()
    expect(data.destroyProgress).toBe(10)
    expect(data.breakingBlockId).toBe('minecraft:stone')
  })

  it.each([NaN, Infinity])('stops contraption drills for nonfinite RPM=%s', rpm => {
    const data = new Map([['drill', {}]])
    const target = vi.fn()
    const tick = loadFunction(DRILL_FILE, 'mechanicalDrillEntityTick', {
      drillData: data, getEntityDrillKey: () => 'drill', getEntityDrillTarget: target,
    })
    expect(tick({ isValid: true, getProperty: () => rpm })).toBe(false)
    expect(data.has('drill')).toBe(false)
    expect(target).not.toHaveBeenCalled()
  })
})

describe('Water wheel regression checks (isolated functions, not Minecraft)', () => {
  const file = 'create/andrielScripts/blocks/waterWheel.js'

  it.each([0, 1, 7, 8, 15])('calculates water height at liquid depth %s', depth => {
    const height = loadFunction(file, 'waterHeight')
    expect(height(depth)).toBe(depth === 0 || depth >= 8 ? 8 : 8 - depth)
  })

  it('detects falling water without reading neighboring blocks', () => {
    const getBlock = vi.fn()
    const flow = loadFunction(file, 'getFlowAt')
    expect(flow({ permutation: { getState: () => 8 } }, { getBlock })).toEqual({ hx: 0, hz: 0, vy: -1 })
    expect(getBlock).not.toHaveBeenCalled()
  })

  it('returns normalized flow toward a lower east neighbor', () => {
    const flow = loadFunction(file, 'getFlowAt', {
      waterHeight: loadFunction(file, 'waterHeight'), WATER_IDS: new Set(['minecraft:water']),
    })
    const water = { x: 0, y: 0, z: 0, permutation: { getState: () => 0 } }
    const dimension = { getBlock: ({ x }) => x === 1
      ? { typeId: 'minecraft:water', permutation: { getState: () => 4 } }
      : { typeId: 'minecraft:stone', isAir: false } }
    expect(flow(water, dimension)).toEqual({ hx: 1, hz: 0, vy: 0 })
  })

  it.each([undefined, true, 2])('does not scan flow for an invalid wheel facing: %s', rotation => {
    const getBlock = vi.fn()
    const score = loadFunction(file, 'calculateFlowScore')
    expect(score({ permutation: { getState: () => rotation } }, { getBlock })).toBe(0)
    expect(getBlock).not.toHaveBeenCalled()
  })

  it.each([-4, 0, 4])('updates generator state without losing facing for flow score %s', score => {
    const data = new Map()
    const states = { 'minecraft:facing_direction': 'east', 'create:active_generator': score === 0 }
    const block = {
      x: 1, y: 2, z: 3, typeId: 'create:water_wheel', center: () => ({}),
      permutation: { getAllStates: () => states }, setPermutation: vi.fn(),
    }
    const entity = { setDynamicProperty: vi.fn() }
    const runJob = vi.fn()
    const resolve = vi.fn(() => ({ updated: true }))
    const tick = loadFunction(file, 'waterWheelTick', {
      system: { currentTick: 100, runJob }, FLOW_CHECK_RATE: 60, wheelData: data,
      posToKey: (x, y, z) => `${x},${y},${z}`, calculateFlowScore: () => score,
      BlockPermutation: { resolve }, recalculateNetwork: () => 'job',
    })
    const dimension = { getEntities: () => [entity] }
    tick(block, dimension)
    expect(entity.setDynamicProperty).toHaveBeenCalledWith('create:generator_rpm', Math.sign(score) * 8)
    expect(resolve).toHaveBeenCalledWith(block.typeId, { ...states, 'create:active_generator': score !== 0 })
    expect(block.setPermutation).toHaveBeenCalledWith({ updated: true })
    expect(runJob).toHaveBeenCalledWith('job')
    tick(block, dimension)
    expect(entity.setDynamicProperty).toHaveBeenCalledOnce()
    expect(runJob).toHaveBeenCalledOnce()
  })

  it('retries immediately when the wheel entity is not loaded', () => {
    const data = new Map()
    const score = vi.fn(() => 0)
    const runJob = vi.fn()
    const tick = loadFunction(file, 'waterWheelTick', {
      system: { currentTick: 100, runJob }, FLOW_CHECK_RATE: 60, wheelData: data,
      posToKey: () => 'wheel', calculateFlowScore: score, recalculateNetwork: vi.fn(),
    })
    tick({ center: () => ({}) }, { getEntities: () => [] })
    expect(data.get('wheel')).toEqual({ lastFlowScore: null, lastCheckTick: 40 })
    expect(score).not.toHaveBeenCalled()
    expect(runJob).not.toHaveBeenCalled()
  })
})

describe('Large water wheel regression checks (isolated functions, not Minecraft)', () => {
  const file = 'create/andrielScripts/blocks/largeWaterWheel.js'

  it.each([
    ['X', { x: 0, y: 2, z: 1 }],
    ['Y', { x: 1, y: 0, z: 2 }],
    ['Z', { x: 1, y: 2, z: 0 }],
  ])('maps rim offsets and computes unit tangents on axis %s', (axis, expected) => {
    const offset = loadFunction(file, 'rimToWorld')(1, 2, axis)
    const tangent = loadFunction(file, 'computePositive')(offset, axis)
    expect(offset).toEqual(expected)
    expect(tangent.x ** 2 + tangent.y ** 2 + tangent.z ** 2).toBeCloseTo(1)
    expect(offset.x * tangent.x + offset.y * tangent.y + offset.z * tangent.z).toBeCloseTo(0)
    expect(tangent[axis.toLowerCase()]).toBe(0)
  })

  it('returns a finite zero tangent at the center', () => {
    expect(loadFunction(file, 'computePositive')({ x: 0, y: 0, z: 0 }, 'Z')).toEqual({ x: 0, y: 0, z: 0 })
  })

  it.each([undefined, true, 2])('rejects invalid facing without scanning rim blocks: %s', rotation => {
    const getBlock = vi.fn()
    expect(loadFunction(file, 'calculateFlowScore')({ permutation: { getState: () => rotation } }, { getBlock })).toBe(0)
    expect(getBlock).not.toHaveBeenCalled()
  })

  it.each([-1, 1])('scores all twelve rim positions for tangential flow sign %s', sign => {
    const offsets = [[0, 2], [0, -2], [2, 0], [-2, 0], [1, 2], [-1, 2], [1, -2], [-1, -2], [2, 1], [2, -1], [-2, 1], [-2, -1]]
    const computePositive = loadFunction(file, 'computePositive')
    const getBlock = vi.fn(pos => ({ ...pos, typeId: 'minecraft:water' }))
    const score = loadFunction(file, 'calculateFlowScore', {
      INVERT_FACE: { north: 'south' }, getAxisFromRotation: () => 'Z', RIM_OFFSETS: offsets,
      rimToWorld: loadFunction(file, 'rimToWorld'), computePositive, WATER_IDS: new Set(['minecraft:water']),
      getFlowAt: block => {
        const tangent = computePositive(block, 'Z')
        return { hx: sign * tangent.x, vy: sign * tangent.y, hz: 0 }
      },
    })
    expect(score({ x: 0, y: 0, z: 0, permutation: { getState: () => 'north' } }, { getBlock })).toBe(sign * 12)
    expect(getBlock).toHaveBeenCalledTimes(12)
  })

  it.each([-12, 0, 12])('clamps score %s to four RPM and preserves block states', score => {
    const system = { currentTick: 100, runJob: vi.fn() }
    const data = new Map()
    const states = { 'minecraft:facing_direction': 'west', 'create:active_generator': score === 0 }
    const block = { x: 1, y: 2, z: 3, typeId: 'create:large_water_wheel', center: () => ({}), permutation: { getAllStates: () => states }, setPermutation: vi.fn() }
    const entity = { setDynamicProperty: vi.fn() }
    const resolve = vi.fn(() => ({ updated: true }))
    const tick = loadFunction(file, 'largeWaterWheelTick', {
      system, FLOW_CHECK_RATE: 60, largeWheelData: data, posToKey: () => 'wheel',
      calculateFlowScore: () => score, BlockPermutation: { resolve }, recalculateNetwork: () => 'job',
    })
    const dimension = { getEntities: () => [entity] }
    tick(block, dimension)
    expect(entity.setDynamicProperty).toHaveBeenCalledWith('create:generator_rpm', Math.sign(score) * 4)
    expect(resolve).toHaveBeenCalledWith(block.typeId, { ...states, 'create:active_generator': score !== 0 })
    expect(block.setPermutation).toHaveBeenCalledWith({ updated: true })
    expect(system.runJob).toHaveBeenCalledWith('job')
    tick(block, dimension)
    system.currentTick += 60
    tick(block, dimension)
    expect(entity.setDynamicProperty).toHaveBeenCalledOnce()
    expect(system.runJob).toHaveBeenCalledOnce()
  })

  it('leaves the retry timer unchanged until the wheel entity loads', () => {
    const data = new Map()
    const score = vi.fn()
    const tick = loadFunction(file, 'largeWaterWheelTick', {
      system: { currentTick: 100 }, FLOW_CHECK_RATE: 60, largeWheelData: data,
      posToKey: () => 'wheel', calculateFlowScore: score,
    })
    tick({ center: () => ({}) }, { getEntities: () => [] })
    expect(data.get('wheel')).toEqual({ lastFlowScore: null, lastCheckTick: 40 })
    expect(score).not.toHaveBeenCalled()
  })

  it('clears only the broken wheel cache entry', () => {
    const data = new Map([['1,2,3', {}], ['4,5,6', {}]])
    loadFunction(file, 'largeWaterWheelDeleteData', {
      largeWheelData: data, posToKey: (x, y, z) => `${x},${y},${z}`,
    })({ x: 1, y: 2, z: 3 })
    expect([...data.keys()]).toEqual(['4,5,6'])
  })
})

describe('Furnace engine regression checks (isolated functions, not Minecraft)', () => {
  const file = 'create/andrielScripts/blocks/furnaceEngine.js'
  const isHorizontalDirection = loadFunction(file, 'isHorizontalDirection')

  it('accepts only horizontal direction strings', () => {
    for (const face of ['north', 'south', 'east', 'west']) expect(isHorizontalDirection(face)).toBe(true)
    for (const face of [undefined, true, 2, 'up', 'down', 'invalid']) expect(isHorizontalDirection(face)).toBe(false)
  })

  it('preserves facing and unrelated states when activating a flywheel', () => {
    const resolve = vi.fn(() => ({ updated: true }))
    const states = { 'minecraft:cardinal_direction': 'east', 'create:active_generator': false }
    const block = { typeId: 'create:flywheel', permutation: { getAllStates: () => states }, setPermutation: vi.fn() }
    loadFunction(file, 'setFlywheelActive', { BlockPermutation: { resolve } })(block, true)
    expect(resolve).toHaveBeenCalledWith(block.typeId, { ...states, 'create:active_generator': true })
    expect(block.setPermutation).toHaveBeenCalledWith({ updated: true })
  })

  function fixture(furnaceId, owner = '', flywheelFacing = 'east') {
    const engineEntity = { setProperty: vi.fn() }
    const properties = new Map([['create:engine_source', owner], ['create:generator_rpm', -1]])
    const flywheelEntity = { getDynamicProperty: key => properties.get(key), setDynamicProperty: vi.fn((key, value) => properties.set(key, value)) }
    const flywheel = { typeId: 'create:flywheel', center: () => ({ x: 0, y: 0, z: 2 }), permutation: { getState: () => flywheelFacing } }
    const block = { x: 0, y: 0, z: 0, typeId: 'create:furnace_engine', center: () => ({ x: 0, y: 0, z: 0 }), permutation: { getState: () => 'north' }, north: () => furnaceId ? { typeId: furnaceId } : undefined, south: vi.fn(() => flywheel) }
    const dimension = { getEntities: ({ location }) => location.z === 2 ? [flywheelEntity] : [engineEntity] }
    const active = vi.fn()
    const runJob = vi.fn()
    const globals = {
      isHorizontalDirection, INVERT_FACE: { north: 'south' },
      furnaceBlocks: new Set(['minecraft:furnace', 'minecraft:lit_furnace', 'minecraft:lit_blast_furnace', 'minecraft:lit_smoker']),
      flywheelRightConn: { north: 'east' }, heatSources: { 'minecraft:lit_furnace': 16, 'minecraft:lit_blast_furnace': 32, 'minecraft:lit_smoker': 16 },
      setFlywheelActive: active, system: { runJob }, recalculateNetwork: () => 'job',
    }
    return { block, dimension, engineEntity, flywheelEntity, flywheel, properties, active, runJob, globals }
  }

  it.each([
    ['minecraft:lit_furnace', 16], ['minecraft:lit_blast_furnace', 32],
    ['minecraft:lit_smoker', 16], ['minecraft:furnace', 0], [undefined, 0],
  ])('sets the expected RPM for furnace %s', (furnaceId, rpm) => {
    const f = fixture(furnaceId)
    loadFunction(file, 'furnaceEngineTick', f.globals)(f.block, f.dimension)
    expect(f.engineEntity.setProperty).toHaveBeenCalledWith('create:has_furnace', furnaceId !== undefined)
    expect(f.engineEntity.setProperty).toHaveBeenCalledWith('create:rpm', rpm)
    expect(f.flywheelEntity.setDynamicProperty).toHaveBeenCalledWith('create:engine_source', '0,0,0')
    expect(f.flywheelEntity.setDynamicProperty).toHaveBeenCalledWith('create:generator_rpm', rpm)
    expect(f.active).toHaveBeenCalledWith(f.flywheel, rpm !== 0)
    expect(f.runJob).toHaveBeenCalledWith('job')
  })

  it.each(['north', undefined])('does not link a flywheel with incompatible facing %s', facing => {
    const f = fixture('minecraft:lit_furnace', '', facing)
    // Explicitly represent an absent state instead of the fixture default.
    f.flywheel.permutation.getState = () => facing
    loadFunction(file, 'furnaceEngineTick', f.globals)(f.block, f.dimension)
    expect(f.engineEntity.setProperty).toHaveBeenCalledWith('create:has_flywheel', false)
    expect(f.flywheelEntity.setDynamicProperty).not.toHaveBeenCalled()
    expect(f.runJob).not.toHaveBeenCalled()
  })

  it('does not take over a flywheel owned by another engine', () => {
    const f = fixture('minecraft:lit_furnace', '9,9,9')
    loadFunction(file, 'furnaceEngineTick', f.globals)(f.block, f.dimension)
    expect(f.flywheelEntity.setDynamicProperty).not.toHaveBeenCalled()
    expect(f.active).not.toHaveBeenCalled()
  })

  it.each(['0,0,0', '9,9,9'])('releases only a flywheel owned by the broken engine: %s', owner => {
    const f = fixture('minecraft:lit_furnace', owner)
    loadFunction(file, 'onBreakFurnaceEngine', f.globals)(f.block, f.dimension, { getState: () => 'north' })
    if (owner === '0,0,0') {
      expect(f.properties.get('create:engine_source')).toBe('')
      expect(f.properties.get('create:generator_rpm')).toBe(0)
      expect(f.active).toHaveBeenCalledWith(f.flywheel, false)
      expect(f.runJob).toHaveBeenCalledWith('job')
    } else {
      expect(f.flywheelEntity.setDynamicProperty).not.toHaveBeenCalled()
      expect(f.active).not.toHaveBeenCalled()
    }
  })

  it('handles an unloaded furnace neighbor when creating the engine visual', () => {
    const f = fixture(undefined)
    loadFunction(file, 'furnaceEngineFrame', f.globals)(f.block, f.dimension)
    expect(f.engineEntity.setProperty).toHaveBeenCalledWith('create:has_furnace', false)
    expect(f.engineEntity.setProperty).toHaveBeenCalledWith('create:cardinal_rotation', 'south')
  })
})

describe('Compatibility fluid registry regression checks', () => {
  const file = 'create/compatibility/registries.js'

  function registry() {
    const fluid = { id: 'example:oil', empty: 'example:can' }
    const globals = {
      compatibilityFluids: new Map([[fluid.id, fluid]]),
      compatibilityFluidsByBucket: new Map([['example:oil_can', fluid]]),
      compatibilityFluidsByBlock: new Map([['example:oil_block', fluid]]),
    }
    const getFluid = loadFunction(file, 'getCompatibilityFluid', globals)
    return {
      fluid, globals, getFluid,
      resolveId: loadFunction(file, 'resolveCompatibilityFluidId', { getCompatibilityFluid: getFluid }),
      isContainer: loadFunction(file, 'isCompatibilityFluidContainer', globals),
    }
  }

  it.each(['example:oil', 'example:oil_can', 'example:oil_block'])('resolves fluid identity from %s', id => {
    const r = registry()
    expect(r.getFluid(id)).toBe(r.fluid)
    expect(r.resolveId(id)).toBe(r.fluid.id)
  })

  it('keeps fluid, filled-container, then block lookup precedence', () => {
    const r = registry()
    const bucketFluid = { id: 'example:bucket_oil' }
    const blockFluid = { id: 'example:block_oil' }
    r.globals.compatibilityFluidsByBucket.set('example:oil', bucketFluid)
    r.globals.compatibilityFluidsByBlock.set('example:oil', blockFluid)
    expect(r.getFluid('example:oil')).toBe(r.fluid)
    r.globals.compatibilityFluids.delete('example:oil')
    expect(r.getFluid('example:oil')).toBe(bucketFluid)
    r.globals.compatibilityFluidsByBucket.delete('example:oil')
    expect(r.getFluid('example:oil')).toBe(blockFluid)
  })

  it.each([undefined, null, true, 42, {}, 'example:unknown'])('returns no fluid or container for invalid/unknown ID %j', id => {
    const r = registry()
    expect(r.getFluid(id)).toBeUndefined()
    expect(r.resolveId(id)).toBeUndefined()
    expect(r.isContainer(id)).toBe(false)
  })

  it('does not consult registries for a non-string lookup', () => {
    const get = vi.fn()
    const getFluid = loadFunction(file, 'getCompatibilityFluid', {
      compatibilityFluids: { get }, compatibilityFluidsByBucket: { get }, compatibilityFluidsByBlock: { get },
    })
    expect(getFluid({})).toBeUndefined()
    expect(get).not.toHaveBeenCalled()
  })

  it('recognizes filled and empty containers but not fluid blocks', () => {
    const r = registry()
    expect(r.isContainer('example:oil_can')).toBe(true)
    expect(r.isContainer('example:can')).toBe(true)
    expect(r.isContainer('example:oil_block')).toBe(false)
    expect(r.isContainer('example:oil')).toBe(false)
  })
})

describe('Block hardness definitions regression checks', () => {
  it.each([
    ['minecraft:air', 0],
    ['minecraft:allium', 0],
    ['minecraft:activator_rail', 0.7],
    ['minecraft:andesite', 1.5],
    ['minecraft:ancient_debris', 30],
    ['minecraft:barrier', -1],
    ['minecraft:allow', -1],
    ['example:custom_block', 3],
    ['minecraft:unknown_block', 3],
  ])('returns the configured hardness or fallback for %s', (typeId, expected) => {
    const block = { typeId }
    expect(getBlockHardness(block)).toBe(expected)
    expect(isUnbreakable(block)).toBe(expected < 0)
  })

  it('does not mutate the block while checking hardness', () => {
    const block = Object.freeze({ typeId: 'minecraft:andesite' })
    expect(getBlockHardness(block)).toBe(1.5)
    expect(isUnbreakable(block)).toBe(false)
    expect(block).toEqual({ typeId: 'minecraft:andesite' })
  })
})

describe('Visual entity fishing guard regression checks', () => {
  const file = 'create/racoScripts/visualEntityGuard.js'

  it('deduplicates dimensions and restores a displaced protected visual', () => {
    const anchor = { x: 0.5, y: 0.5, z: 0.5 }
    const block = { typeId: 'create:brass_funnel', center: () => anchor }
    const visual = { isValid: true, typeId: 'create:brass_funnel_entity', location: { x: 0.75, y: 0.5, z: 0.5 }, clearVelocity: vi.fn(), teleport: vi.fn() }
    const hook = { isValid: true, location: { x: 0.5, y: 0.5, z: 0.5 }, remove: vi.fn() }
    const dimension = {
      id: 'minecraft:overworld',
      getEntities: vi.fn(query => query.type === 'minecraft:fishing_hook' ? [hook] : [visual]),
      getBlock: ({ x, y, z }) => x === 0 && y === 0 && z === 0 ? block : undefined,
    }
    visual.dimension = dimension
    guardVisualEntitiesFromFishing([{ isValid: true, dimension }, { isValid: true, dimension }, { isValid: false, dimension }])
    expect(dimension.getEntities).toHaveBeenCalledTimes(2)
    expect(visual.clearVelocity).toHaveBeenCalledOnce()
    expect(visual.teleport).toHaveBeenCalledWith(anchor)
    expect(hook.remove).toHaveBeenCalledOnce()
  })

  it('does not remove hooks or disturb ordinary entities', () => {
    const entity = { isValid: true, typeId: 'minecraft:cow', clearVelocity: vi.fn(), teleport: vi.fn() }
    const hook = { isValid: true, location: {}, remove: vi.fn() }
    const dimension = { id: 'minecraft:overworld', getEntities: query => query.type === 'minecraft:fishing_hook' ? [hook] : [entity] }
    guardVisualEntitiesFromFishing([{ isValid: true, dimension }])
    expect(hook.remove).not.toHaveBeenCalled()
    expect(entity.clearVelocity).not.toHaveBeenCalled()
    expect(entity.teleport).not.toHaveBeenCalled()
  })

  it('leaves an anchored visual in place while removing a nearby hook', () => {
    const location = { x: 0.5, y: 0.5, z: 0.5 }
    const visual = { isValid: true, typeId: 'create:brass_funnel_entity', location, clearVelocity: vi.fn(), teleport: vi.fn() }
    const hook = { isValid: true, location, remove: vi.fn() }
    const dimension = {
      id: 'minecraft:overworld', getEntities: query => query.type === 'minecraft:fishing_hook' ? [hook] : [visual],
      getBlock: ({ x, y, z }) => x === 0 && y === 0 && z === 0 ? { typeId: 'create:brass_funnel', center: () => location } : undefined,
    }
    visual.dimension = dimension
    guardVisualEntitiesFromFishing([{ isValid: true, dimension }])
    expect(visual.clearVelocity).toHaveBeenCalledOnce()
    expect(visual.teleport).not.toHaveBeenCalled()
    expect(hook.remove).toHaveBeenCalledOnce()
  })

  it('does not anchor crafter items that are currently moving', () => {
    const nearest = vi.fn()
    const anchor = loadFunction(file, 'getVisualAnchor', {
      hasAnyTag: loadFunction(file, 'hasAnyTag'), nearestCrafterItemLocation: nearest,
    })
    expect(anchor({ typeId: 'create:mechanical_crafter_item', hasTag: tag => tag === 'create_mechanical_crafter_item_moving' })).toBeUndefined()
    expect(nearest).not.toHaveBeenCalled()
  })

  it.each([
    ['north', { x: 0.5, y: 0.38, z: 1.1 }],
    ['south', { x: 0.5, y: 0.38, z: -0.1 }],
    ['east', { x: -0.1, y: 0.38, z: 0.5 }],
    ['west', { x: 1.1, y: 0.38, z: 0.5 }],
    [true, { x: 0.5, y: 0.38, z: -0.1 }],
  ])('places crafter item anchors for facing %s', (face, expected) => {
    const locate = loadFunction(file, 'crafterItemLocation', {
      INVERT_FACE: { north: 'south', south: 'north', east: 'west', west: 'east' }, CRAFTER_ITEM_Y: 0.38,
      CRAFTER_FRONT_OFFSET: { north: { x: 0, y: 0.38, z: -0.6 }, south: { x: 0, y: 0.38, z: 0.6 }, east: { x: 0.6, y: 0.38, z: 0 }, west: { x: -0.6, y: 0.38, z: 0 } },
    })
    const actual = locate({ location: { x: 0, y: 0, z: 0 }, permutation: { getState: () => face } })
    for (const axis of ['x', 'y', 'z']) expect(actual[axis]).toBeCloseTo(expected[axis])
  })

  it('ignores unloaded blocks and enforces the anchor distance limit', () => {
    const block = { typeId: 'create:depot', center: () => ({ x: 0.5, y: 0.5, z: 0.5 }) }
    const dimension = { getBlock: ({ x, y, z }) => {
      if (x < 0) throw new Error('unloaded chunk')
      return x === 0 && y === 0 && z === 0 ? block : undefined
    } }
    const nearest = loadFunction(file, 'nearestBlock', {
      SEARCH_RADIUS: 2, getBlockAt: loadFunction(file, 'getBlockAt'), distanceSq: loadFunction(file, 'distanceSq'),
    })
    const entity = { dimension, location: { x: 0.75, y: 0.5, z: 0.5 } }
    expect(nearest(entity, 'create:depot', candidate => candidate.center(), 0.3)).toBe(block)
    expect(nearest(entity, 'create:depot', candidate => candidate.center(), 0.2)).toBeUndefined()
  })
})

describe('Creative crate regression checks (isolated functions, not Minecraft)', () => {
  const file = 'create/racoScripts/blocks/creativeCrate.js'

  it.each([[0, 1], [1, 1], [10, 10], [100, 16]])('clones the configured item and clamps requested amount %s to %s', (amount, expected) => {
    const item = { amount: 1, maxAmount: 16, clone: () => ({ amount: 1, maxAmount: 16 }) }
    const getItem = loadFunction(file, 'getCreativeCrateItem', { storedItem: () => item, getVisual: () => ({}) })
    const result = getItem({ typeId: 'create:crate_creative' }, amount)
    expect(result).not.toBe(item)
    expect(result.amount).toBe(expected)
    expect(item.amount).toBe(1)
  })

  it('does not read a visual for blocks that are not creative crates', () => {
    const getVisual = vi.fn()
    const getItem = loadFunction(file, 'getCreativeCrateItem', { getVisual })
    expect(getItem(undefined)).toBeUndefined()
    expect(getItem({ typeId: 'minecraft:chest' })).toBeUndefined()
    expect(getVisual).not.toHaveBeenCalled()
  })

  it('returns no item when the crate has no configured visual item', () => {
    const getItem = loadFunction(file, 'getCreativeCrateItem', { getVisual: () => undefined, storedItem: () => undefined })
    expect(getItem({ typeId: 'create:crate_creative' })).toBeUndefined()
  })

  it('removes duplicate visuals while retaining the valid primary visual', () => {
    const primary = { isValid: true, remove: vi.fn() }
    const duplicate = { remove: vi.fn() }
    const getVisual = loadFunction(file, 'getVisual', { visuals: () => [primary, duplicate] })
    expect(getVisual({})).toBe(primary)
    expect(duplicate.remove).toHaveBeenCalledOnce()
    expect(primary.remove).not.toHaveBeenCalled()
  })

  it('configures a one-item clone without consuming the held stack', () => {
    const held = { typeId: 'minecraft:stone', amount: 64, clone: () => ({ typeId: 'minecraft:stone', amount: 64 }) }
    const configure = vi.fn()
    const block = {}
    loadFunction(file, 'creativeCrateInteract', { setConfiguredItem: configure })(block, {}, held)
    expect(configure).toHaveBeenCalledWith(block, { typeId: held.typeId, amount: 1 })
    expect(configure.mock.calls[0][1]).not.toBe(held)
    expect(held.amount).toBe(64)
  })

  it('clears configuration only for sneaking empty-hand interactions and ignores wrenches', () => {
    const configure = vi.fn()
    const interact = loadFunction(file, 'creativeCrateInteract', { setConfiguredItem: configure })
    const block = {}
    interact(block, { isSneaking: false }, undefined)
    interact(block, { isSneaking: true }, { typeId: 'create:wrench' })
    expect(configure).not.toHaveBeenCalled()
    interact(block, { isSneaking: true }, undefined)
    expect(configure).toHaveBeenCalledWith(block, undefined)
  })

  it.each([undefined, { amount: 1 }])('reports inventory insertion accurately for remainder %j', remainder => {
    const item = { amount: 1 }
    const container = { addItem: vi.fn(() => remainder) }
    const insert = loadFunction(file, 'insertInto')
    expect(insert(container, item)).toBe(remainder === undefined)
    expect(container.addItem).toHaveBeenCalledWith(item)
    expect(insert(undefined, item)).toBe(false)
    expect(insert(container, undefined)).toBe(false)
  })

  it('feeds exactly one generated item into a hopper below', () => {
    const container = {}
    const item = {}
    const generate = vi.fn(() => item)
    const insert = vi.fn()
    const block = { below: () => ({ typeId: 'minecraft:hopper', getComponent: () => ({ container }) }) }
    loadFunction(file, 'feedHopperBelow', { getCreativeCrateItem: generate, insertInto: insert })(block)
    expect(generate).toHaveBeenCalledWith(block, 1)
    expect(insert).toHaveBeenCalledWith(container, item)
  })

  it('anchors a displaced visual and clears its velocity during a crate tick', () => {
    const target = { x: 0.5, y: 0.8975, z: 0.5 }
    const entity = { isValid: true, location: { x: 1, y: 1, z: 1 }, teleport: vi.fn(), clearVelocity: vi.fn() }
    const feed = vi.fn()
    const block = {}
    loadFunction(file, 'creativeCrateTick', { getVisual: () => entity, visualLocation: () => target, feedHopperBelow: feed })(block)
    expect(entity.teleport).toHaveBeenCalledWith(target)
    expect(entity.clearVelocity).toHaveBeenCalledOnce()
    expect(feed).toHaveBeenCalledWith(block)
  })

  it('removes every crate visual on break', () => {
    const entities = [{ remove: vi.fn() }, { remove: vi.fn() }]
    loadFunction(file, 'creativeCrateBreak', { visuals: () => entities })({ dimension: {} })
    for (const entity of entities) expect(entity.remove).toHaveBeenCalledOnce()
  })
})

describe('Whistle regression checks (isolated functions, not Minecraft)', () => {
  const file = 'create/andrielScripts/blocks/whistle.js'

  it('preserves unrelated states when updating a whistle custom state', () => {
    const states = { 'minecraft:cardinal_direction': 'west', 'create:connected_above': true, 'create:powered': false }
    const resolve = vi.fn(() => ({ updated: true }))
    const block = { typeId: 'create:whistle', permutation: { getAllStates: () => states }, setPermutation: vi.fn() }
    loadFunction(file, 'updateWhistleStates', { BlockPermutation: { resolve } })(block, { 'create:powered': true })
    expect(resolve).toHaveBeenCalledWith(block.typeId, { ...states, 'create:powered': true })
    expect(block.setPermutation).toHaveBeenCalledWith({ updated: true })
  })

  it.each([['west', 'west'], [undefined, 'south'], [true, 'south'], [2, 'south']])('narrows whistle direction %s to %s', (value, expected) => {
    expect(loadFunction(file, 'getDirection')({ permutation: { getState: () => value } })).toBe(expected)
  })

  it.each([true, false])('updates sound and visual on a redstone transition to powered=%s', powered => {
    const entity = { setDynamicProperty: vi.fn() }
    const visual = vi.fn(() => entity)
    const stop = vi.fn()
    const remove = vi.fn()
    const update = vi.fn()
    const dimension = { playSound: vi.fn() }
    const block = { typeId: 'create:whistle', permutation: { getAllStates: () => ({ 'create:powered': !powered }) }, center: () => ({}) }
    const redstone = loadFunction(file, 'whistleRedstoneUpdate', {
      WHISTLE_ID: block.typeId, updateWhistleStates: update, ensureVisual: visual,
      stopWhistleSound: stop, removeVisual: remove, system: { currentTick: 123 },
    })
    redstone(block, dimension, powered ? 15 : 0)
    expect(update).toHaveBeenCalledWith(block, { 'create:powered': powered })
    if (powered) {
      expect(visual).toHaveBeenCalledWith(block)
      expect(dimension.playSound).toHaveBeenCalledOnce()
      expect(entity.setDynamicProperty).toHaveBeenCalledWith('create:last_whistle_sound_tick', 123)
      expect(stop).not.toHaveBeenCalled()
    } else {
      expect(stop).toHaveBeenCalledWith(block)
      expect(remove).toHaveBeenCalledWith(block)
      expect(visual).not.toHaveBeenCalled()
    }
  })

  it('does not replay sound or recreate visuals for unchanged redstone power', () => {
    const update = vi.fn()
    const visual = vi.fn()
    loadFunction(file, 'whistleRedstoneUpdate', { WHISTLE_ID: 'create:whistle', updateWhistleStates: update, ensureVisual: visual })(
      { typeId: 'create:whistle', permutation: { getAllStates: () => ({ 'create:powered': true }) } }, {}, 15,
    )
    expect(update).not.toHaveBeenCalled()
    expect(visual).not.toHaveBeenCalled()
  })

  it.each([[31, 0], [32, 1]])('replays an active whistle at the 32-tick interval: elapsed=%s', (elapsed, expected) => {
    const entity = { getDynamicProperty: () => 100, setDynamicProperty: vi.fn() }
    const steam = vi.fn()
    const dimension = { playSound: vi.fn() }
    const block = { typeId: 'create:whistle', dimension, center: () => ({}), permutation: { getAllStates: () => ({ 'create:powered': true }) } }
    loadFunction(file, 'whistleTick', { WHISTLE_ID: block.typeId, WHISTLE_SOUND_INTERVAL: 32, system: { currentTick: 100 + elapsed }, ensureVisual: () => entity, emitSteam: steam })(block)
    expect(dimension.playSound).toHaveBeenCalledTimes(expected)
    expect(entity.setDynamicProperty).toHaveBeenCalledTimes(expected)
    expect(steam).toHaveBeenCalledWith(block)
  })

  it('removes unpowered visuals without emitting steam', () => {
    const remove = vi.fn()
    const steam = vi.fn()
    const block = { typeId: 'create:whistle', permutation: { getAllStates: () => ({ 'create:powered': false }) } }
    loadFunction(file, 'whistleTick', { WHISTLE_ID: block.typeId, removeVisual: remove, emitSteam: steam })(block)
    expect(remove).toHaveBeenCalledWith(block)
    expect(steam).not.toHaveBeenCalled()
  })

  it('stops whistle audio using the supported player command API', () => {
    const player = { runCommand: vi.fn() }
    const block = { center: () => ({}), dimension: { getPlayers: () => [player] } }
    loadFunction(file, 'stopWhistleSound')(block)
    expect(player.runCommand).toHaveBeenCalledWith('stopsound @s create:whistle')
  })

  it('stops audio and removes visuals when a whistle is removed with a wrench', () => {
    const player = { runCommand: vi.fn() }
    const remove = vi.fn()
    const dimension = { getPlayers: () => [player], getBlock: () => undefined }
    const location = { x: 1, y: 2, z: 3 }
    loadFunction(file, 'whistleWrenchRemoved', {
      WHISTLE_ID: 'create:whistle', WHISTLE_TUBE_ID: 'create:whistle_tubo', removeVisualAt: remove,
    })(dimension, location, 'create:whistle')
    expect(remove).toHaveBeenCalledWith(dimension, location)
    expect(player.runCommand).toHaveBeenCalledWith('stopsound @s create:whistle')
  })

  it('converts a supported whistle into a tube with its placement direction', () => {
    const location = { x: 0, y: 2, z: 0 }
    const current = { typeId: 'create:whistle', setPermutation: vi.fn() }
    const below = { typeId: 'create:whistle' }
    const dimension = { getBlock: pos => pos.y === 2 ? current : below }
    const resolve = vi.fn(() => ({ tube: true }))
    const update = vi.fn()
    const block = { typeId: 'create:whistle', dimension, location }
    loadFunction(file, 'whistlePlace', {
      WHISTLE_ID: block.typeId, WHISTLE_TUBE_ID: 'create:whistle_tubo', system: { run: callback => callback() },
      getDirection: () => 'east', BlockPermutation: { resolve }, updateWhistleStates: update,
    })(block)
    expect(resolve).toHaveBeenCalledWith('create:whistle_tubo', { 'minecraft:cardinal_direction': 'east', 'create:connected_above': false })
    expect(current.setPermutation).toHaveBeenCalledWith({ tube: true })
    expect(update).toHaveBeenCalledWith(below, { 'create:connected_above': true })
  })
})

describe('Engineer goggles HUD regression checks', () => {
  it('clears a previously visible goggles panel once per player', () => {
    const player = { id: 'player-1', onScreenDisplay: { setActionBar: vi.fn() } }
    const panels = new Set([player.id])
    const clear = loadFunction('create/andrielScripts/armorAndTools/engineersGoggles.js', 'clearGogglesPanel', { visibleGogglesPanels: panels })
    clear(player)
    clear(player)
    expect(player.onScreenDisplay.setActionBar).toHaveBeenCalledOnce()
    expect(player.onScreenDisplay.setActionBar).toHaveBeenCalledWith({ rawtext: [] })
    expect(panels.has(player.id)).toBe(false)
  })

  it.each([
    [0, 'create.hud.goggles.speed.none'], [1, 'create.hud.goggles.speed.slow'],
    [30, 'create.hud.goggles.speed.medium'], [100, 'create.hud.goggles.speed.fast'],
  ])('formats the speed gauge at %s RPM', (rpm, label) => {
    const level = loadFunction('create/andrielScripts/armorAndTools/engineersGoggles.js', 'getSpeedLevel')(rpm)
    expect(level.label).toBe(label)
    expect(level.bar).toHaveLength(3)
  })

  it.each([[0, 'create.hud.goggles.stressImpact.low'], [0.6, 'create.hud.goggles.stressImpact.medium'], [0.8, 'create.hud.goggles.stressImpact.high'], [1.1, 'create.hud.goggles.stressImpact.overstressed']])('formats stress gauge fraction %s', (fraction, label) => {
    expect(loadFunction('create/andrielScripts/armorAndTools/engineersGoggles.js', 'getStressLevel')(fraction).label).toBe(label)
  })

  it.each([[0.5, '§a'], [1, '§a'], [2, '§a']])('clamps boiler bar fill ratio %s to eight cells', (fraction, color) => {
    const bar = loadFunction('create/andrielScripts/armorAndTools/engineersGoggles.js', 'boilerBar')(fraction, color)
    const [filled, empty] = bar.split('\u00a78')
    expect([...filled].filter(character => character === '█')).toHaveLength(Math.round(Math.min(1, fraction) * 8))
    expect([...empty].filter(character => character === '█')).toHaveLength(8 - Math.round(Math.min(1, fraction) * 8))
  })

  it.each([
    ['minecraft:water_bucket', 'create.hud.goggles.fluid.water'],
    ['minecraft:lava_bucket', 'create.hud.goggles.fluid.lava'],
    ['minecraft:milk_bucket', 'create.hud.goggles.fluid.milk'],
    ['create:honey_bucket', 'create.hud.goggles.fluid.honey'],
    ['create:chocolate_bucket', 'create.hud.goggles.fluid.chocolate'],
    ['example:fluid_bucket', 'create.hud.goggles.fluid.unknown'],
  ])('translates fluid item %s', (fluid, expected) => {
    const translate = loadFunction('create/andrielScripts/armorAndTools/engineersGoggles.js', 'fluidTranslationKey', { compatibilityFluids: new Map() })
    expect(translate(fluid)).toBe(expected)
  })

  it('uses compatibility fluid translation metadata when present', () => {
    expect(loadFunction('create/andrielScripts/armorAndTools/engineersGoggles.js', 'fluidTranslationKey', {
      compatibilityFluids: new Map([['example:oil_bucket', { translationKey: 'example.oil' }]]),
    })('example:oil_bucket')).toBe('example.oil')
  })

  it.each([[5, 5], ['5', 0], [Infinity, 0], [NaN, 0], [undefined, 0]])('accepts only finite numeric HUD data: %s', (value, expected) => {
    const numeric = loadFunction('create/andrielScripts/armorAndTools/engineersGoggles.js', 'finiteNumber')
    expect(numeric(value)).toBe(expected)
  })


})

describe('Create compatibility API regression checks (isolated exports, not Minecraft)', () => {
  function compatibilityState() {
    return {
      compatibilityRecipes: {
        millstone: new Map(), crushing: new Map(), pressing: new Map(), mixing: [], spouting: [],
        blasting: new Map(), smoking: new Map(), splashing: new Map(), haunting: new Map(),
        sequenced: [], crafting: [], crafting_shapeless: [],
      },
      compatibilityFluids: new Map(), compatibilityFluidsByBucket: new Map(), compatibilityFluidsByBlock: new Map(),
    }
  }

  function recipeRegistrar(state) {
    const globals = {
      ...state, ID: /^[a-z0-9_.-]+:[a-z0-9_./-]+$/, MACHINES: new Set(['millstone', 'crushing', 'pressing', 'mixing', 'spouting', 'blasting', 'smoking', 'splashing', 'haunting', 'sequenced', 'crafting', 'crafting_shapeless']),
      FAN_MACHINES: new Set(['blasting', 'smoking', 'splashing', 'haunting']), SEQUENCED_OPERATIONS: new Set(['deploy', 'press', 'spout', 'cut']),
      id: loadFunction('create/compatibility/index.js', 'id', { ID: /^[a-z0-9_.-]+:[a-z0-9_./-]+/ }),
      positive: loadFunction('create/compatibility/index.js', 'positive'),
      clone: value => JSON.parse(JSON.stringify(value)),
    }
    globals.normalizeOutputs = loadFunction('create/compatibility/index.js', 'normalizeOutputs', globals)
    return loadFunction('create/compatibility/index.js', 'registerMachineRecipe', globals)
  }

  it('registers crushing outputs with validated defaults and rejects invalid identifiers', () => {
    const state = compatibilityState()
    const register = recipeRegistrar(state)
    expect(register('crushing', { input: 'minecraft:iron_ore', duration: 80, output: [{ item: 'create:crushed_raw_iron', count: 2 }] })).toBe(true)
    expect(state.compatibilityRecipes.crushing.get('minecraft:iron_ore')).toEqual({ duration: 80, particleRGB: undefined, output: [{ item: 'create:crushed_raw_iron', count: 2, chance: 1 }] })
    expect(() => register('crushing', { input: 'bad-id', output: [{ item: 'create:crushed_raw_iron' }] })).toThrow(/namespaced identifier/)
    expect(() => register('unknown', {})).toThrow(/Unknown machine/)
  })

  it('normalizes sequenced operations and rejects duplicate recipe IDs', () => {
    const state = compatibilityState()
    const register = recipeRegistrar(state)
    const definition = { id: 'example:gear', input: 'minecraft:iron_ingot', result: 'create:shaft', inProgress: 'create:incomplete', steps: [{ type: 'press' }] }
    expect(register('sequenced', definition)).toBe(true)
    expect(state.compatibilityRecipes.sequenced[0]).toMatchObject({ id: 'example:gear', surface: 'minecraft:iron_ingot', result: 'create:shaft', steps: [{ operation: 'press', keepHeld: false }] })
    expect(() => register('sequenced', definition)).toThrow(/Duplicate sequenced/)
    expect(() => register('sequenced', { ...definition, id: 'example:bad', steps: [{ type: 'smelt' }] })).toThrow(/Unknown sequenced operation/)
  })

  it('validates crafting results and marks shapeless recipes', () => {
    const state = compatibilityState()
    const register = recipeRegistrar(state)
    expect(register('crafting_shapeless', { result: { id: 'create:shaft', amount: 2 }, ingredients: ['minecraft:iron_ingot'] })).toBe(true)
    expect(state.compatibilityRecipes.crafting_shapeless[0]).toMatchObject({ shapeless: true, result: { id: 'create:shaft', amount: 2 } })
    expect(() => register('crafting', { result: { id: 'create:shaft' } })).toThrow(/requires pattern and key/)
  })

  it('registers fluid aliases and clears prior bucket/block indexes when replacing', () => {
    const state = compatibilityState()
    const globals = { ...state, ID: /^[a-z0-9_.-]+:[a-z0-9_./-]+$/, FLUID_VISUAL_TYPES: new Set(['water', 'lava', 'honey', 'chocolate', 'milk']), clone: value => JSON.parse(JSON.stringify(value)), id: loadFunction('create/compatibility/index.js', 'id', { ID: /^[a-z0-9_.-]+:[a-z0-9_./-]+$/ }) }
    const register = loadFunction('create/compatibility/index.js', 'registerFluid', globals)
    expect(register({ id: 'example:oil', bucket: 'example:oil_bucket', empty: 'example:can', block: 'example:oil_block', visualType: 'honey' })).toBe(true)
    expect(state.compatibilityFluids.get('example:oil')).toMatchObject({ id: 'example:oil', bucket: 'example:oil_bucket', block: 'example:oil_block', visualType: 'honey' })
    expect(state.compatibilityFluidsByBucket.get('example:oil_bucket')?.id).toBe('example:oil')
    expect(state.compatibilityFluidsByBlock.get('example:oil_block')?.id).toBe('example:oil')
    register({ id: 'example:oil', bucket: 'example:new_oil_bucket', empty: 'minecraft:bucket' })
    expect(state.compatibilityFluidsByBucket.has('example:oil_bucket')).toBe(false)
    expect(state.compatibilityFluidsByBlock.has('example:oil_block')).toBe(false)
    expect(state.compatibilityFluidsByBucket.get('example:new_oil_bucket')?.id).toBe('example:oil')
    expect(() => register({ id: 'invalid' })).toThrow(/namespaced identifier/)
  })
})

describe('Hatch inventory transfer regression checks (isolated helpers, not Minecraft)', () => {
  it('does not change the source stack while creating partial transfer clones', () => {
    const stack = { amount: 9, clone: () => ({ amount: 9 }) }
    const clone = loadFunction('create/racoScripts/blocks/hatch.js', 'cloneStack')
    const partial = clone(stack, 4)
    expect(partial).not.toBe(stack)
    expect(partial.amount).toBe(4)
    expect(stack.amount).toBe(9)
  })

  it.each([0, 1, 7])('inserts the largest fitting amount %s across inventory targets', requested => {
    const attempts = []
    let totalMoved = 0
    const insert = loadFunction('create/racoScripts/blocks/hatch.js', 'insertIntoTargets', {
      insertAmountIntoTarget: (_target, _item, amount) => {
        attempts.push(amount)
        if (totalMoved + amount > requested) return false
        if (amount <= 3) { totalMoved += amount; return true }
        return false
      },
    })
    const moved = insert([{ type: 'inventory' }, { type: 'vault' }], { amount: requested })
    expect(moved).toBe(requested)
    if (requested > 3) expect(attempts.slice(0, 4)).toEqual([requested, requested - 1, requested - 2, requested - 3])
  })

  it('deduplicates targets by inventory location and vault ID', () => {
    const targets = []
    const seen = new Set()
    const add = loadFunction('create/racoScripts/blocks/hatch.js', 'addTarget')
    const inventory = { type: 'inventory', key: 'overworld:1,2,3', inventory: {} }
    add(targets, seen, inventory)
    add(targets, seen, { ...inventory })
    add(targets, seen, { type: 'vault', storage: { id: 'vault-1' } })
    add(targets, seen, { type: 'vault', storage: { id: 'vault-1' } })
    expect(targets).toHaveLength(2)
  })

  it('handles invalid, missing, and selected player inventory slots safely', () => {
    const selected = loadFunction('create/racoScripts/blocks/hatch.js', 'getSelectedSlot')
    expect(selected(undefined)).toBeUndefined()
    expect(selected({ selectedSlotIndex: 2 })).toBe(2)
    expect(selected({ selectedSlotIndex: -1 })).toBe(-1)
    expect(selected({ selectedSlotIndex: '1' })).toBeUndefined()
    const inventory = { size: 4, getItem: vi.fn(() => ({ amount: 5 })), setItem: vi.fn() }
    const remove = loadFunction('create/racoScripts/blocks/hatch.js', 'depositHeldStack', { insertIntoTargets: () => 2, getPlayerInventory: () => inventory, getSelectedSlot: () => 1 })
    expect(remove({}, { getGameMode: () => 'Survival' }, [{ type: 'inventory' }], { amount: 5 })).toBe(true)
    expect(inventory.setItem).toHaveBeenCalledWith(1, { amount: 3 })
  })

  it('leaves inventory unchanged if target insertion moves nothing', () => {
    const inventory = { getItem: vi.fn(), setItem: vi.fn() }
    const deposit = loadFunction('create/racoScripts/blocks/hatch.js', 'depositHeldStack', { insertIntoTargets: () => 0, getPlayerInventory: () => inventory })
    expect(deposit({}, {}, [], { amount: 3 })).toBe(false)
    expect(inventory.getItem).not.toHaveBeenCalled()
    expect(inventory.setItem).not.toHaveBeenCalled()
  })

  it('opens the hatch only after a successful transfer', () => {
    const open = vi.fn()
    const block = { typeId: 'create:hatch' }
    const interact = loadFunction('create/racoScripts/blocks/hatch.js', 'hatchInteract', {
      HATCH_TYPE: block.typeId, findTargetStorages: () => [{}], depositHeldStack: () => true,
      depositInventoryOnly: vi.fn(), setHatchOpen: open,
    })
    expect(interact(block, { isSneaking: false }, { amount: 1 })).toBe(true)
    expect(open).toHaveBeenCalledWith(block)
  })
})

describe('Bedrock runtime regression checks (isolated functions, not Minecraft)', () => {
  it('transfers into a compatible full inventory without an undefined playerItem', () => {
    const item = { amount: 8, typeId: 'create:andesite_alloy' }
    const existing = { amount: 10, maxAmount: 64, isStackableWith: vi.fn((other) => other.typeId === item.typeId) }
    const source = { getItem: () => item, setItem: vi.fn() }
    const destination = { emptySlotsCount: 0, size: 1, getItem: () => existing, addItem: vi.fn() }
    loadFunction('create/racoScripts/raco-API.js', 'transferItem')(source, destination, 0, 3)
    expect(existing.isStackableWith).toHaveBeenCalledWith(item)
    expect(source.setItem).toHaveBeenCalledOnce()
    expect(destination.addItem).toHaveBeenCalledOnce()
    expect(destination.addItem.mock.calls[0][0].amount).toBe(3)
  })

  it('restores normal tank fluid visuals after world reload', () => {
    const block = { typeId: 'create:fluid_tank', location: { x: 0, y: 0, z: 0 } }
    const state = { fluid: 'minecraft:water', amount: 500 }
    const sync = vi.fn()
    const rebuild = loadFunction('create/tank/fluidTank.js', 'rebuildLoadedFluidTanks', {
      mc: { world: { getDynamicPropertyIds: () => ['create:fluid_tank:overworld:0,0,0'], getDimension: () => ({}) } },
      TANK_ID: 'create:fluid_tank', CREATIVE_TANK_ID: 'create:creative_fluid_tank', CAPACITY_PER_BLOCK: 1000,
      safeBlock: () => block, posKey: () => '0,0,0',
      fluidTankVisualStructure: { expandOrAssemble: vi.fn() }, connectedTankBlocks: () => [block],
      readState: () => state, writeState: vi.fn(), syncFluidTankVisual: sync,
    })
    rebuild()
    expect(sync).toHaveBeenCalledWith([block], state, 1000)
  })

  it('rolls both success and junk instead of always returning the success item', () => {
    const random = vi.fn()
    const roll = loadFunction('create/racoScripts/blocks/deployer.js', 'rollSequencedResult', { Math: { random } })
    const recipe = { result: 'create:precision_mechanism', junk: [{ item: 'create:cogwheel', weight: 1 }] }
    random.mockReturnValue(0)
    expect(roll(recipe)).toBe('create:cogwheel')
    random.mockReturnValue(0.99)
    expect(roll(recipe)).toBe(recipe.result)
  })

  it.each([9, 10, 11])('breaks an item at its durability boundary (damage: %s)', damage => {
    const durability = { damage: damage - 1, maxDurability: 10 }
    const item = { typeId: 'create:wrench', getComponent: id => id === 'minecraft:durability' ? durability : undefined }
    const slot = { isValid: true, setItem: vi.fn() }
    const inventory = { getItem: () => item, getSlot: () => slot, size: 1 }
    const equipment = { getEquipment: () => item, getEquipmentSlot: () => slot }
    const player = { getComponent: id => id === 'minecraft:inventory' ? { container: inventory } : equipment, playSound: vi.fn(), runCommand: vi.fn() }
    const damageItem = loadFunction('create/andrielScripts/xZ-Utils.js', 'damageDurability', { EquipmentSlot: { Mainhand: 'Mainhand' }, system: { run: callback => callback() } })
    expect(damageItem(player, item, 1)).toBe(damage < 10)
    expect(slot.setItem).toHaveBeenCalledWith(damage < 10 ? item : undefined)
  })

  it('allows non-durable items without dereferencing a missing durability component', () => {
    const damageItem = loadFunction('create/andrielScripts/xZ-Utils.js', 'damageDurability', { EquipmentSlot: { Mainhand: 'Mainhand' }, system: { run: vi.fn() } })
    expect(damageItem({}, { getComponent: () => undefined }, 0)).toBe(true)
  })

  it('accepts only finite numeric motor properties', () => {
    const getRpm = loadFunction('create/andrielScripts/blocks/creativeMotor.js', 'getMotorRpm')
    for (const value of [undefined, '128', true, NaN, Infinity]) expect(getRpm({ getProperty: () => value })).toBe(0)
    for (const value of [-256, 0, 256]) expect(getRpm({ getProperty: () => value })).toBe(value)
  })

  it.each([
    { canceled: true },
    { canceled: false },
    { canceled: false, formValues: [false, '128'] },
    { canceled: false, formValues: [false, NaN] },
    { canceled: false, formValues: [false, 0] },
    { canceled: false, formValues: [false, 257] },
  ])('does not mutate a motor for an invalid/canceled response: %j', async response => {
    const setProperty = vi.fn()
    const entity = { isValid: true, getProperty: () => 0, setProperty, setDynamicProperty: vi.fn() }
    let defaults
    class ModalFormData {
      title() {} toggle() {} submitButton() {}
      slider(_label, _minimum, _maximum, options) { defaults = options }
      show() { return Promise.resolve(response) }
    }
    const dimension = { getEntities: () => [entity], getBlock: vi.fn() }
    const interact = loadFunction('create/andrielScripts/blocks/creativeMotor.js', 'onInteractCreativeMotor', {
      ModalFormData, getMotorRpm: () => 0, system: { runJob: vi.fn() }, recalculateNetwork: vi.fn(),
    })
    interact({ isValid: true, playSound: vi.fn() }, { typeId: 'create:creative_motor', location: { x: 0, y: 0, z: 0 }, center: () => ({ x: 0.5, y: 0.5, z: 0.5 }) }, dimension)
    await new Promise(resolve => setImmediate(resolve))
    expect(defaults.defaultValue).toBe(1)
    expect(setProperty).not.toHaveBeenCalled()
    expect(dimension.getBlock).not.toHaveBeenCalled()
  })

  it.each([true, false])('rechecks the motor after its form closes (still valid: %s)', async valid => {
    const entity = { isValid: true, getProperty: () => 128, setProperty: vi.fn(), setDynamicProperty: vi.fn() }
    const block = { typeId: 'create:creative_motor', location: { x: 0, y: 0, z: 0 }, center: () => ({ x: 0.5, y: 0.5, z: 0.5 }) }
    class ModalFormData {
      title() {} toggle() {} slider() {} submitButton() {}
      show() { return Promise.resolve({ canceled: false, formValues: [true, 128] }) }
    }
    const runJob = vi.fn()
    const job = (function* () {})()
    const interact = loadFunction('create/andrielScripts/blocks/creativeMotor.js', 'onInteractCreativeMotor', {
      ModalFormData, getMotorRpm: () => 128, system: { runJob }, recalculateNetwork: () => job,
    })
    const dimension = { getEntities: () => [entity], getBlock: () => valid ? block : undefined }
    interact({ isValid: true, playSound: vi.fn() }, block, dimension)
    await new Promise(resolve => setImmediate(resolve))
    if (valid) {
      expect(entity.setProperty).toHaveBeenCalledWith('create:rpm', -128)
      expect(entity.setDynamicProperty).toHaveBeenCalledWith('create:generator_rpm', -128)
      expect(runJob).toHaveBeenCalledWith(job)
    } else {
      expect(entity.setProperty).not.toHaveBeenCalled()
      expect(runJob).not.toHaveBeenCalled()
    }
  })

  it('provides orthogonal unit vectors for every kinetic particle orientation', () => {
    const basisFor = loadFunction('create/andrielScripts/blocks/rpmConductors.js', 'getKineticParticleBasis')
    for (const face of ['north', 'south', 'east', 'west', 'up', 'down']) {
      const { a, b } = basisFor(face)
      expect(a.x * b.x + a.y * b.y + a.z * b.z).toBe(0)
      expect(a.x ** 2 + a.y ** 2 + a.z ** 2).toBe(1)
      expect(b.x ** 2 + b.y ** 2 + b.z ** 2).toBe(1)
    }
  })
})
