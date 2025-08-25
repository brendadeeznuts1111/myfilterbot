/**
 * Tests for Enhanced Form Data Utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  parseForm,
  buildForm,
  parseFormSmart,
  validateForm,
  parseQuery,
  buildUrl,
  mergeUrlParams,
  parseCookies,
  buildCookie,
  mergeFormData,
  filterFormData,
  sanitizeFormData
} from '../../src/utils/form-utils';

describe('Form Parsing', () => {
  test('should parse simple form data', () => {
    const result = parseForm('name=John&age=30');
    expect(result).toEqual({
      name: 'John',
      age: '30'
    });
  });

  test('should preserve duplicate keys as arrays', () => {
    const result = parseForm('likes=code&likes=coffee&likes=music');
    expect(result).toEqual({
      likes: ['code', 'coffee', 'music']
    });
  });

  test('should handle mixed single and multiple values', () => {
    const result = parseForm('name=Alice&hobby=reading&hobby=gaming');
    expect(result).toEqual({
      name: 'Alice',
      hobby: ['reading', 'gaming']
    });
  });

  test('should handle URLSearchParams input', () => {
    const params = new URLSearchParams();
    params.append('color', 'red');
    params.append('color', 'blue');
    params.append('size', 'large');
    
    const result = parseForm(params);
    expect(result).toEqual({
      color: ['red', 'blue'],
      size: 'large'
    });
  });
});

describe('Form Building', () => {
  test('should build simple form data', () => {
    const result = buildForm({
      name: 'Jane',
      age: 25
    });
    expect(result).toBe('name=Jane&age=25');
  });

  test('should handle arrays', () => {
    const result = buildForm({
      name: 'Bob',
      skills: ['JavaScript', 'TypeScript', 'Bun']
    });
    expect(result).toBe('name=Bob&skills=JavaScript&skills=TypeScript&skills=Bun');
  });

  test('should handle various data types', () => {
    const result = buildForm({
      name: 'Alice',
      age: 30,
      active: true,
      score: 95.5
    });
    expect(result).toBe('name=Alice&age=30&active=true&score=95.5');
  });

  test('should skip null and undefined values', () => {
    const result = buildForm({
      name: 'Charlie',
      age: null,
      city: undefined,
      country: 'USA'
    });
    expect(result).toBe('name=Charlie&country=USA');
  });

  test('should handle nested objects by stringifying', () => {
    const result = buildForm({
      user: 'john',
      settings: { theme: 'dark', notifications: true }
    });
    expect(result).toContain('user=john');
    expect(result).toContain('settings=%7B%22theme%22%3A%22dark%22%2C%22notifications%22%3Atrue%7D');
  });
});

describe('Smart Form Parsing', () => {
  test('should coerce boolean values', () => {
    const result = parseFormSmart('active=true&archived=false');
    expect(result).toEqual({
      active: true,
      archived: false
    });
  });

  test('should coerce numeric values', () => {
    const result = parseFormSmart('age=25&price=19.99&count=-5');
    expect(result).toEqual({
      age: 25,
      price: 19.99,
      count: -5
    });
  });

  test('should parse JSON values', () => {
    const json = encodeURIComponent('{"theme":"dark"}');
    const result = parseFormSmart(`settings=${json}`);
    expect(result.settings).toEqual({ theme: 'dark' });
  });

  test('should parse ISO dates', () => {
    const result = parseFormSmart('created=2024-01-15T10:30:00');
    expect(result.created).toBeInstanceOf(Date);
    expect(result.created.getFullYear()).toBe(2024);
  });

  test('should handle arrays with type coercion', () => {
    const result = parseFormSmart('values=1&values=2&values=true');
    expect(result.values).toEqual([1, 2, true]);
  });
});

describe('Form Validation', () => {
  test('should validate required fields', () => {
    const schema = {
      name: { required: true },
      email: { required: true }
    };
    
    const result = validateForm({ name: 'John' }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBe('email is required');
  });

  test('should validate data types', () => {
    const schema = {
      age: { type: 'number' as const },
      active: { type: 'boolean' as const }
    };
    
    const result = validateForm({ age: '25', active: true }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.age).toContain('must be of type number');
  });

  test('should validate min/max constraints', () => {
    const schema = {
      password: { type: 'string' as const, min: 8, max: 20 }
    };
    
    const result1 = validateForm({ password: 'short' }, schema);
    expect(result1.valid).toBe(false);
    expect(result1.errors.password).toContain('at least 8');
    
    const result2 = validateForm({ password: 'validpassword123' }, schema);
    expect(result2.valid).toBe(true);
  });

  test('should validate with regex pattern', () => {
    const schema = {
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    };
    
    const result1 = validateForm({ email: 'invalid' }, schema);
    expect(result1.valid).toBe(false);
    
    const result2 = validateForm({ email: 'user@example.com' }, schema);
    expect(result2.valid).toBe(true);
  });

  test('should validate enum values', () => {
    const schema = {
      role: { enum: ['admin', 'user', 'guest'] }
    };
    
    const result1 = validateForm({ role: 'superuser' }, schema);
    expect(result1.valid).toBe(false);
    
    const result2 = validateForm({ role: 'admin' }, schema);
    expect(result2.valid).toBe(true);
  });

  test('should validate with custom function', () => {
    const schema = {
      age: {
        custom: (value: number) => value >= 18 || 'Must be 18 or older'
      }
    };
    
    const result = validateForm({ age: 16 }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors.age).toBe('Must be 18 or older');
  });
});

describe('URL Query String Utilities', () => {
  test('should parse query parameters', () => {
    const result = parseQuery('https://example.com?name=John&tags=js&tags=ts');
    expect(result).toEqual({
      name: 'John',
      tags: ['js', 'ts']
    });
  });

  test('should build URL with parameters', () => {
    const result = buildUrl('https://api.example.com/search', {
      q: 'bun',
      limit: 10,
      tags: ['javascript', 'runtime']
    });
    expect(result).toBe('https://api.example.com/search?q=bun&limit=10&tags=javascript&tags=runtime');
  });

  test('should merge parameters into existing URL', () => {
    const result = mergeUrlParams(
      'https://api.example.com/search?q=bun',
      { limit: 20, sort: 'date' }
    );
    expect(result).toContain('q=bun');
    expect(result).toContain('limit=20');
    expect(result).toContain('sort=date');
  });
});

describe('Cookie Utilities', () => {
  test('should parse cookie header', () => {
    const result = parseCookies('sessionId=abc123; theme=dark; logged_in=true');
    expect(result).toEqual({
      sessionId: 'abc123',
      theme: 'dark',
      logged_in: 'true'
    });
  });

  test('should build cookie with options', () => {
    const cookie = buildCookie('session', 'xyz789', {
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      maxAge: 3600
    });
    
    expect(cookie).toContain('session=xyz789');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Max-Age=3600');
  });

  test('should handle special characters in cookie value', () => {
    const cookie = buildCookie('data', 'hello world!');
    expect(cookie).toBe('data=hello%20world!');
  });
});

describe('Data Manipulation', () => {
  test('should merge form data objects', () => {
    const result = mergeFormData(
      { name: 'John', tags: ['js'] },
      { age: 30, tags: ['ts'] },
      { city: 'NYC' }
    );
    
    expect(result).toEqual({
      name: 'John',
      age: 30,
      city: 'NYC',
      tags: ['js', 'ts']
    });
  });

  test('should filter form data by allowed keys', () => {
    const data = {
      name: 'John',
      password: 'secret',
      email: 'john@example.com',
      _internal: 'hidden'
    };
    
    const result = filterFormData(data, ['name', 'email']);
    expect(result).toEqual({
      name: 'John',
      email: 'john@example.com'
    });
  });

  test('should sanitize form data', () => {
    const result = sanitizeFormData({
      comment: '<script>alert("xss")</script>',
      name: 'John & Jane',
      safe: 'normal text'
    });
    
    expect(result.comment).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
    expect(result.name).toBe('John &amp; Jane');
    expect(result.safe).toBe('normal text');
  });
});

describe('Edge Cases', () => {
  test('should handle empty form data', () => {
    expect(parseForm('')).toEqual({});
    expect(buildForm({})).toBe('');
  });

  test('should handle special characters in keys and values', () => {
    const data = { 'user[name]': 'John Doe', 'tags[]': ['a&b', 'c=d'] };
    const built = buildForm(data);
    const parsed = parseForm(built);
    
    expect(parsed['user[name]']).toBe('John Doe');
    expect(parsed['tags[]']).toEqual(['a&b', 'c=d']);
  });

  test('should handle very long values', () => {
    const longString = 'a'.repeat(10000);
    const result = buildForm({ data: longString });
    expect(result).toContain(longString);
  });
});

describe('Round-trip Testing', () => {
  test('should maintain data integrity through parse/build cycle', () => {
    const original = {
      name: 'Alice',
      age: 30,
      tags: ['developer', 'bun', 'typescript'],
      active: true
    };
    
    const formString = buildForm(original);
    const parsed = parseFormSmart(formString);
    
    expect(parsed.name).toBe(original.name);
    expect(parsed.age).toBe(original.age);
    expect(parsed.tags).toEqual(original.tags);
    expect(parsed.active).toBe(original.active);
  });
});