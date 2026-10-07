/** @param {import('@minecraft/server').Entity | import('@minecraft/server').Block | undefined} target */
export function getInventory(target) {
  if (!target) return undefined;
  try {
    return target.getComponent('minecraft:inventory')?.container;
  } catch {
    return undefined;
  }
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {number | undefined} limitSlots */
export function limitedSize(inventory, limitSlots = inventory?.size) {
  return Math.max(0, Math.min(inventory?.size ?? 0, limitSlots ?? inventory?.size ?? 0));
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {number | undefined} limitSlots */
export function inventoryStats(inventory, limitSlots = inventory?.size) {
  if (!inventory) return { occupied: 0, free: 0, size: 0 };
  const size = limitedSize(inventory, limitSlots);
  let occupied = 0;

  for (let slot = 0; slot < size; slot++) {
    if (inventory.getItem(slot)) occupied++;
  }

  return {
    occupied,
    free: size - occupied,
    size
  };
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {number | undefined} limitSlots */
export function listItems(inventory, limitSlots = inventory?.size) {
  if (!inventory) return [];
  const size = limitedSize(inventory, limitSlots);
  const items = [];

  for (let slot = 0; slot < size; slot++) {
    const item = inventory.getItem(slot);
    if (!item) continue;

    items.push({
      slot,
      typeId: item.typeId,
      amount: item.amount,
      maxAmount: item.maxAmount
    });
  }

  return items;
}

/** @param {import('@minecraft/server').ItemStack | undefined} current @param {import('@minecraft/server').ItemStack | undefined} incoming */
export function canStackItems(current, incoming) {
  if (!current || !incoming) return false;
  if (typeof current.isStackableWith === "function") {
    try {
      return current.isStackableWith(incoming);
    } catch {
      return false;
    }
  }

  return current.typeId === incoming.typeId;
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {import('@minecraft/server').ItemStack | undefined} itemStack @param {number | undefined} limitSlots */
function availableSpaceForItem(inventory, itemStack, limitSlots = inventory?.size) {
  if (!inventory || !itemStack) return 0;

  const size = limitedSize(inventory, limitSlots);
  let available = 0;

  for (let slot = 0; slot < size; slot++) {
    const current = inventory.getItem(slot);
    if (!current) {
      available += itemStack.maxAmount ?? 64;
      continue;
    }

    if (!canStackItems(current, itemStack)) continue;
    const maxAmount = current.maxAmount ?? itemStack.maxAmount ?? 64;
    available += Math.max(0, maxAmount - current.amount);
  }

  return available;
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {import('@minecraft/server').ItemStack | undefined} itemStack @param {number | undefined} amount @param {number | undefined} limitSlots */
export function addItemLimited(inventory, itemStack, amount = itemStack?.amount, limitSlots = inventory?.size) {
  if (!inventory || !itemStack) return false;
  const requestedAmount = amount ?? itemStack.amount;
  if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) return false;

  const size = limitedSize(inventory, limitSlots);
  let remaining = Math.min(requestedAmount, itemStack.amount);
  if (availableSpaceForItem(inventory, itemStack, size) < remaining) return false;

  for (let slot = 0; slot < size && remaining > 0; slot++) {
    const current = inventory.getItem(slot);
    if (!current || !canStackItems(current, itemStack)) continue;

    const maxAmount = current.maxAmount ?? itemStack.maxAmount ?? 64;
    const moved = Math.min(remaining, Math.max(0, maxAmount - current.amount));
    if (moved <= 0) continue;

    current.amount += moved;
    inventory.setItem(slot, current);
    remaining -= moved;
  }

  for (let slot = 0; slot < size && remaining > 0; slot++) {
    if (inventory.getItem(slot)) continue;

    const copy = itemStack.clone?.() ?? itemStack;
    copy.amount = Math.min(remaining, copy.maxAmount ?? itemStack.maxAmount ?? 64);
    inventory.setItem(slot, copy);
    remaining -= copy.amount;
  }

  return remaining === 0;
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {number} amount @param {number | undefined} limitSlots */
export function removeFirstItem(inventory, amount = 1, limitSlots = inventory?.size) {
  if (!inventory || amount <= 0) return undefined;

  const size = limitedSize(inventory, limitSlots);
  for (let slot = 0; slot < size; slot++) {
    const item = inventory.getItem(slot);
    if (!item) continue;

    const removed = item.clone?.() ?? item;
    removed.amount = Math.min(amount, item.amount);

    if (item.amount > removed.amount) {
      item.amount -= removed.amount;
      inventory.setItem(slot, item);
    } else {
      inventory.setItem(slot, undefined);
    }

    return removed;
  }

  return undefined;
}

/** @param {import('@minecraft/server').ItemStack} item @param {string | {typeId?: string} | ((item: import('@minecraft/server').ItemStack) => boolean) | undefined} filter */
function matchesFilter(item, filter) {
  if (!filter) return true;
  if (typeof filter === "function") return filter(item);
  if (typeof filter === "string") return item.typeId === filter;
  if (filter.typeId) return item.typeId === filter.typeId;
  return true;
}

/** @param {import('@minecraft/server').Container | undefined} inventory @param {string | {typeId?: string} | ((item: import('@minecraft/server').ItemStack) => boolean) | undefined} filter @param {number} amount @param {number | undefined} limitSlots */
export function removeMatchingItem(inventory, filter, amount = 1, limitSlots = inventory?.size) {
  if (!inventory || amount <= 0) return undefined;

  const size = limitedSize(inventory, limitSlots);
  for (let slot = 0; slot < size; slot++) {
    const item = inventory.getItem(slot);
    if (!item || !matchesFilter(item, filter)) continue;

    const removed = item.clone?.() ?? item;
    removed.amount = Math.min(amount, item.amount);

    if (item.amount > removed.amount) {
      item.amount -= removed.amount;
      inventory.setItem(slot, item);
    } else {
      inventory.setItem(slot, undefined);
    }

    return removed;
  }

  return undefined;
}

/** @param {import('@minecraft/server').Entity} entity @param {import('@minecraft/server').Dimension} dimension @param {import('@minecraft/server').Vector3} location */
export function dropInventory(entity, dimension, location) {
  const inventory = getInventory(entity);
  if (!inventory) return 0;

  let dropped = 0;
  for (let slot = 0; slot < inventory.size; slot++) {
    const item = inventory.getItem(slot);
    if (!item) continue;

    dimension.spawnItem(item, location);
    inventory.setItem(slot, undefined);
    dropped++;
  }

  return dropped;
}
