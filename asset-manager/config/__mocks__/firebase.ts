/**
 * Jest manual mock for config/firebase.
 * Prevents loading real Firebase which uses ESM Jest cannot parse.
 */
export const db = {};
export const auth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(() => () => {}),
};
export const storage = {};
export const functions = {};
export default {};
