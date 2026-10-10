import { describe, expect, it } from 'vitest';
import { validateGig, validateRegister } from './validation';

const options = { categories: ['design', 'video'], maxPrice: 100000 };
const goodGig = { title: ' Logo design ', description: 'A clean, modern logo', price: '149.99', category: 'design', deliveryDays: '5' };

describe('validateGig', () => {
  it('converts price and delivery days to real numbers and trims text', () => {
    const { errors, values } = validateGig(goodGig, options);
    expect(errors).toEqual({});
    expect(values).toEqual({
      title: 'Logo design',
      description: 'A clean, modern logo',
      price: 149.99,
      category: 'design',
      deliveryDays: 5,
    });
    expect(typeof values.price).toBe('number');
    expect(typeof values.deliveryDays).toBe('number');
  });

  it('rejects the same things the API rejects', () => {
    const { errors } = validateGig(
      { title: 'ab', description: 'short', price: '10.123', category: 'hacking', deliveryDays: '2.5' },
      options
    );
    expect(Object.keys(errors).sort()).toEqual(['category', 'deliveryDays', 'description', 'price', 'title']);
    expect(validateGig({ ...goodGig, price: '0' }, options).errors.price).toMatch(/between 1 and/);
    expect(validateGig({ ...goodGig, price: '1e3' }, options).errors.price).toBeDefined();
    expect(validateGig({ ...goodGig, deliveryDays: '91' }, options).errors.deliveryDays).toBeDefined();
  });
});

describe('validateRegister', () => {
  it('mirrors the API rules for name, email, password and role', () => {
    const errors = validateRegister({ name: 'A', email: 'nope', password: 'password', role: 'admin' });
    expect(errors.name).toMatch(/2-60/);
    expect(errors.email).toMatch(/valid email/);
    expect(errors.password).toMatch(/number/);
    expect(errors.role).toBeDefined();
    expect(validateRegister({ name: 'Ann', email: 'ann@example.com', password: 'password1', role: 'client' })).toEqual({});
  });
});
