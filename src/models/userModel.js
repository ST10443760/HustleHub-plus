/**
 * In-memory user "model" for Part 1.
 *
 * No database yet - the POE explicitly allows in-memory or file-based
 * storage at this stage. This gets swapped for a real MongoDB model in
 * Part 2; keeping the function names the same (findByEmail, createUser,
 * findById) means the controller code barely has to change when that
 * swap happens.
 *
 * IMPORTANT: this resets every time the server restarts - that's expected
 * and fine for Part 1.
 */

let users = [];
let nextId = 1;

function findByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findById(id) {
  return users.find((u) => u.id === id);
}

function createUser({ name, email, passwordHash, role = 'client' }) {
  const user = {
    id: nextId++,
    name,
    email,
    passwordHash,
    role, // 'client' | 'freelancer' | 'admin' - role-based access lands in Part 2
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

// Returns a safe, public-facing copy of a user with no password hash.
function toPublicUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

module.exports = { findByEmail, findById, createUser, toPublicUser };
