'use strict';

const { v4: uuidv4 } = require('uuid');
const userService = require('./users');

// ---------------------------------------------------------------------------
// In-memory store
// ---------------------------------------------------------------------------

/** @type {Map<string, object>} */
const territories = new Map();

const now = new Date().toISOString();

const SEED_TERRITORIES = [
  {
    id: 'territory-west',
    name: 'West Coast',
    region: 'North America',
    description: 'Covers California, Oregon, Washington, Nevada, and Arizona',
    statesCovered: ['CA', 'OR', 'WA', 'NV', 'AZ'],
    quotaUsd: 2500000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'territory-east',
    name: 'East Coast',
    region: 'North America',
    description: 'Covers New York, New Jersey, Massachusetts, Connecticut, and surrounding states',
    statesCovered: ['NY', 'NJ', 'MA', 'CT', 'ME', 'NH', 'VT', 'RI'],
    quotaUsd: 3000000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'territory-central',
    name: 'Central US',
    region: 'North America',
    description: 'Covers Illinois, Texas, Minnesota, Ohio, and surrounding states',
    statesCovered: ['IL', 'TX', 'MN', 'OH', 'IN', 'MI', 'WI', 'MO'],
    quotaUsd: 2000000,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

for (const territory of SEED_TERRITORIES) {
  territories.set(territory.id, territory);
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * List all territories.
 *
 * @returns {Promise<{ territories: object[], total: number }>}
 */
async function listTerritories() {
  const result = Array.from(territories.values());
  return { territories: result, total: result.length };
}

/**
 * Retrieve a single territory by id.
 *
 * @param {string} id
 * @returns {Promise<object>}
 */
async function getTerritoryById(id) {
  const territory = territories.get(id);
  if (!territory) {
    const err = new Error(`Territory '${id}' not found`);
    err.status = 404;
    throw err;
  }
  return territory;
}

/**
 * List all users assigned to a specific territory.
 *
 * @param {string} territoryId
 * @returns {Promise<{ users: object[], total: number, territory: object }>}
 */
async function listUsersInTerritory(territoryId) {
  const territory = await getTerritoryById(territoryId);
  const { users, total } = await userService.getUsersByTerritory(territoryId);
  return { users, total, territory };
}

/**
 * Create a new territory.
 *
 * @param {{ name: string, region: string, description?: string, statesCovered?: string[], quotaUsd?: number }} data
 * @returns {Promise<object>}
 */
async function createTerritory(data) {
  const id = uuidv4();
  const ts = new Date().toISOString();

  const territory = {
    id,
    name: data.name,
    region: data.region,
    description: data.description || '',
    statesCovered: data.statesCovered || [],
    quotaUsd: data.quotaUsd || 0,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  };

  territories.set(id, territory);
  return territory;
}

/**
 * Update a territory's details.
 *
 * @param {string} id
 * @param {{ name?: string, region?: string, description?: string, statesCovered?: string[], quotaUsd?: number, isActive?: boolean }} updates
 * @returns {Promise<object>}
 */
async function updateTerritory(id, updates) {
  const territory = await getTerritoryById(id);

  const allowedFields = ['name', 'region', 'description', 'statesCovered', 'quotaUsd', 'isActive'];
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      territory[field] = updates[field];
    }
  }

  territory.updatedAt = new Date().toISOString();
  territories.set(id, territory);
  return territory;
}

module.exports = {
  listTerritories,
  getTerritoryById,
  listUsersInTerritory,
  createTerritory,
  updateTerritory,
};
