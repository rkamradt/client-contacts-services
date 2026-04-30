'use strict';

const { v4: uuidv4 } = require('uuid');

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} */
const users = new Map();

// Seed realistic data
const now = new Date().toISOString();

const SEED_TERRITORIES = ['territory-west', 'territory-east', 'territory-central'];

const SEED_USERS = [
  {
    id: 'user-001',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    email: 'sarah.mitchell@clientcontacts.io',
    phone: '+1-415-555-0101',
    title: 'VP of Sales',
    role: 'sales_manager',
    permissions: ['read:contacts', 'write:contacts', 'read:opportunities', 'write:opportunities', 'manage:users'],
    territoryId: 'territory-west',
    managerId: null,
    avatarUrl: 'https://i.pravatar.cc/150?u=user-001',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user-002',
    firstName: 'James',
    lastName: 'Thornton',
    email: 'james.thornton@clientcontacts.io',
    phone: '+1-212-555-0202',
    title: 'Account Executive',
    role: 'sales_rep',
    permissions: ['read:contacts', 'write:contacts', 'read:opportunities', 'write:opportunities'],
    territoryId: 'territory-east',
    managerId: 'user-001',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-002',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user-003',
    firstName: 'Priya',
    lastName: 'Nair',
    email: 'priya.nair@clientcontacts.io',
    phone: '+1-312-555-0303',
    title: 'Sales Development Representative',
    role: 'sdr',
    permissions: ['read:contacts', 'write:contacts'],
    territoryId: 'territory-central',
    managerId: 'user-001',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-003',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'user-004',
    firstName: 'Derek',
    lastName: 'Okafor',
    email: 'derek.okafor@clientcontacts.io',
    phone: '+1-415-555-0404',
    title: 'Senior Account Executive',
    role: 'sales_rep',
    permissions: ['read:contacts', 'write:contacts', 'read:opportunities', 'write:opportunities'],
    territoryId: 'territory-west',
    managerId: 'user-001',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-004',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

for (const user of SEED_USERS) {
  users.set(user.id, user);
}

// ---------------------------------------------------------------------------
// Event publishing (best-effort, non-blocking)
// ---------------------------------------------------------------------------

/**
 * Publishes a domain event. In production this would POST to an event bus or
 * push onto a message queue. Here we log it so the contract is visible.
 *
 * @param {string} topic
 * @param {object} payload
 */
function publishEvent(topic, payload) {
  const envelope = { topic, occurredAt: new Date().toISOString(), payload };
  console.info('[event]', JSON.stringify(envelope));
  // TODO: replace with real event bus client (e.g. axios.post(EVENT_BUS_URL, envelope))
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List / search users with optional filters.
 *
 * @param {{ territoryId?: string, role?: string, managerId?: string, isActive?: string }} filters
 * @returns {Promise<{ users: object[], total: number }>}
 */
async function listUsers(filters = {}) {
  let result = Array.from(users.values());

  if (filters.territoryId) {
    result = result.filter((u) => u.territoryId === filters.territoryId);
  }
  if (filters.role) {
    result = result.filter((u) => u.role === filters.role);
  }
  if (filters.managerId) {
    result = result.filter((u) => u.managerId === filters.managerId);
  }
  if (filters.isActive !== undefined) {
    const activeFlag = filters.isActive === 'true' || filters.isActive === true;
    result = result.filter((u) => u.isActive === activeFlag);
  }

  return { users: result, total: result.length };
}

/**
 * Retrieve a single user by id.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getUserById(id) {
  const user = users.get(id);
  if (!user) {
    const err = new Error(`User '${id}' not found`);
    err.status = 404;
    throw err;
  }
  return user;
}

/**
 * Update a user's profile fields.
 *
 * @param {string} id
 * @param {{ firstName?: string, lastName?: string, email?: string, phone?: string, title?: string, managerId?: string, avatarUrl?: string }} updates
 * @returns {Promise<object>}
 */
async function updateUser(id, updates) {
  const user = await getUserById(id);

  const allowedFields = ['firstName', 'lastName', 'email', 'phone', 'title', 'avatarUrl', 'managerId'];
  const appliedFields = [];

  const previousManagerId = user.managerId;

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      user[field] = updates[field];
      appliedFields.push(field);
    }
  }

  if (appliedFields.length === 0) {
    const err = new Error('No updatable fields provided');
    err.status = 400;
    throw err;
  }

  user.updatedAt = new Date().toISOString();
  users.set(id, user);

  publishEvent('user.profile-updated', {
    userId: id,
    updatedFields: appliedFields,
    updatedAt: user.updatedAt,
  });

  // Team change if managerId changed
  if (updates.managerId !== undefined && updates.managerId !== previousManagerId) {
    publishEvent('user.team-changed', {
      userId: id,
      previousManagerId,
      newManagerId: updates.managerId,
      changedAt: user.updatedAt,
    });
  }

  return user;
}

/**
 * Get the territory currently assigned to a user.
 *
 * @param {string} id
 * @returns {Promise<{ territoryId: string, userId: string }>}
 */
async function getUserTerritory(id) {
  const user = await getUserById(id);
  // Delegate to territories service for full territory object lookup.
  // Here we return what the user record owns directly.
  return {
    userId: user.id,
    territoryId: user.territoryId,
  };
}

/**
 * Assign (or reassign) a user to a territory.
 *
 * @param {string} id
 * @param {string} territoryId
 * @returns {Promise<object>}
 */
async function assignUserTerritory(id, territoryId) {
  const user = await getUserById(id);
  const previousTerritoryId = user.territoryId;

  user.territoryId = territoryId;
  user.updatedAt = new Date().toISOString();
  users.set(id, user);

  publishEvent('user.territory-changed', {
    userId: id,
    previousTerritoryId,
    newTerritoryId: territoryId,
    changedAt: user.updatedAt,
  });

  return user;
}

/**
 * List direct subordinates (team members) of a manager.
 *
 * @param {string} id  — manager's user id
 * @returns {Promise<{ subordinates: object[], total: number }>}
 */
async function getUserSubordinates(id) {
  // Confirm the manager exists first
  await getUserById(id);

  const subordinates = Array.from(users.values()).filter(
    (u) => u.managerId === id
  );

  return { subordinates, total: subordinates.length };
}

/**
 * Update a user's role and optional permissions list.
 *
 * @param {string} id
 * @param {{ role: string, permissions?: string[] }} roleUpdate
 * @returns {Promise<object>}
 */
async function updateUserRole(id, { role, permissions }) {
  const user = await getUserById(id);

  const previousRole = user.role;
  user.role = role;

  if (Array.isArray(permissions)) {
    user.permissions = permissions;
  }

  user.updatedAt = new Date().toISOString();
  users.set(id, user);

  publishEvent('user.role-updated', {
    userId: id,
    previousRole,
    newRole: role,
    permissions: user.permissions,
    updatedAt: user.updatedAt,
  });

  return user;
}

/**
 * List all users belonging to a given territory.
 *
 * @param {string} territoryId
 * @returns {Promise<{ users: object[], total: number }>}
 */
async function getUsersByTerritory(territoryId) {
  const result = Array.from(users.values()).filter(
    (u) => u.territoryId === territoryId
  );
  return { users: result, total: result.length };
}

module.exports = {
  listUsers,
  getUserById,
  updateUser,
  getUserTerritory,
  assignUserTerritory,
  getUserSubordinates,
  updateUserRole,
  getUsersByTerritory,
};
