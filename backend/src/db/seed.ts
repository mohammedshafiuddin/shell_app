import { db } from './db_index.js';
import {
  roleInfoTable,
} from './schema.js';

/**
 * Seeds the database with initial data
 * Adds roles: gen_user, doctor, hospital_assistant, admin, hospital_admin
 * Adds common medical specializations
 */
export async function seed() {
  try {
    console.log('Starting database seeding...');

    // Define the roles we want to ensure exist
    const rolesToSeed = [
      { name: 'gen_user', displayName: 'General User', description: 'General user with basic access' },
      { name: 'admin', displayName: 'Administrator', description: 'System administrator with full access to all features' },
    ];

    // Get existing roles from the database
    const existingRoles = await db.select().from(roleInfoTable);
    const existingRoleNames = new Set(existingRoles.map(role => role.name));

    // Filter out roles that already exist
    const newRoles = rolesToSeed.filter(role => !existingRoleNames.has(role.name));

    // Insert only new roles
    let insertedRoles: { id: number; name: string }[] = [];
    if (newRoles.length > 0) {
      console.log(`Inserting ${newRoles.length} new roles...`);
      insertedRoles = await db.insert(roleInfoTable)
        .values(newRoles)
        .returning({ id: roleInfoTable.id, name: roleInfoTable.name });
      
    } else {
      console.log('All roles already exist. No new roles added.');
    }
    
    // Get all roles (existing + newly inserted)
    const allRoles = await db.select().from(roleInfoTable);
    
    // Create a map of role names to role IDs
    const roleMap = new Map<string, number>();
    allRoles.forEach(role => {
      roleMap.set(role.name, role.id);
    });


    return { roleMap, newRolesAdded: insertedRoles };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

export default seed;