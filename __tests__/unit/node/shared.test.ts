import { normalizeBase } from 'node/shared'

describe('node/shared#normalizeBase', () => {
  test.each([
    // GitHub Pages configure-pages `base_path` for project pages has no
    // trailing slash and must be normalized, otherwise URLs like
    // `/repoassets/app.js` are generated. See deploy workflow regression.
    ['/repo', '/repo/'],
    ['/repo/', '/repo/'],
    ['/a/b', '/a/b/'],
    ['/', '/'],
    ['https://example.com/base', 'https://example.com/base/']
  ])('normalizeBase(%j) -> %j', (input, expected) => {
    expect(normalizeBase(input)).toBe(expected)
  })
})
