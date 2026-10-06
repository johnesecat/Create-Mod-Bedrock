import { readFileSync } from 'node:fs'
import { parse } from 'acorn'
import { describe, expect, it, vi } from 'vitest'

function loadFunction(file, name, globals = {}) {
  const text = readFileSync(new URL('../Create (BE)/scripts/' + file, import.meta.url), 'utf8')
  const ast = parse(text, { ecmaVersion: 'latest', sourceType: 'module' })
  const node = ast.body.map((node) => node.declaration ?? node).find((node) => node.type === 'FunctionDeclaration' && node.id.name === name)
  if (!node) throw new Error(`Missing function: ${name}`)
  return new Function(...Object.keys(globals), `return (${text.slice(node.start, node.end)})`)(...Object.values(globals))
}

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
