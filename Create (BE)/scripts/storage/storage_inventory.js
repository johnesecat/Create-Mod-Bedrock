export function getInventory(target) {
  for (const id of ["minecraft:inventory", "inventory"]) {
    try {
      const inventory = target?.getComponent(id)?.container;
      if (inventory) return inventory;
    } catch {}
  }

  return undefined;
}

export function limitedSize(inventory, limitSlots = inventory?.size) {
  return Math.max(0, Math.min(inventory?.size ?? 0, limitSlots ?? inventory?.size ?? 0));
}

export function inventoryStats(inventory, limitSlots = inventory?.size) {
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

export function listItems(inventory, limitSlots = inventory?.size) {
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

export function addItemLimited(inventory, itemStack, amount = itemStack?.amount, limitSlots = inventory?.size) {
  if (!inventory || !itemStack || amount <= 0) return false;

  const size = limitedSize(inventory, limitSlots);
  let remaining = Math.min(amount, itemStack.amount);
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

function matchesFilter(item, filter) {
  if (!filter) return true;
  if (typeof filter === "function") return filter(item);
  if (typeof filter === "string") return item.typeId === filter;
  if (filter.typeId) return item.typeId === filter.typeId;
  return true;
}

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
