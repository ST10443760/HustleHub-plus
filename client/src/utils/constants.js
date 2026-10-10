// Must match GIG_CATEGORIES in api/src/models/Gig.js - the API rejects
// any other value.
export const GIG_CATEGORIES = ['design', 'writing', 'development', 'marketing', 'video', 'other'];

// Roles a user can pick when registering. Admin is never offered: admin
// accounts are seeded on the server and the API rejects role "admin".
export const REGISTER_ROLES = [
  { value: 'client', label: 'Client - I want to book gigs' },
  { value: 'freelancer', label: 'Freelancer - I want to offer gigs' },
];

export const GIGS_PAGE_SIZE = 12;

// Same as the API's price cap in the gig validators.
export const MAX_PRICE = 100000;
