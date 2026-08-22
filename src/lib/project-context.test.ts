import { describe, expect, it } from 'vitest'
import { projectFromLocation } from './project-context'

describe('projectFromLocation', () => {
  it('reads the project identity passed by the extension side panel', () => {
    expect(projectFromLocation('?extension=1&project=abc-123')).toBe('abc-123')
  })

  it('does not invent a project when the query is absent or blank', () => {
    expect(projectFromLocation('')).toBeUndefined()
    expect(projectFromLocation('?extension=1&project=')).toBeUndefined()
  })
})
