import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (name) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8')

describe('container deployment topology', () => {
  it('starts web, chat, and agent as separate services', () => {
    const compose = read('../docker-compose.yml')
    expect(compose).toMatch(/services:\s+web:/)
    expect(compose).toMatch(/\n  chat:/)
    expect(compose).toMatch(/\n  agent:/)
    expect(compose).toContain('AGENT_BRIDGE_URL=http://agent:3022/api')
    expect(compose).toContain('AGENT_BRIDGE_HOST=0.0.0.0')
    expect(compose).not.toMatch(/agent:[\s\S]*?ports:/)
  })

  it('keeps chat and agent credentials in service environments', () => {
    const compose = read('../docker-compose.yml')
    expect(compose).toContain('OPENAI_API_KEY=${OPENAI_API_KEY:-}')
    expect(compose).toContain('IONOS_API_KEY=${IONOS_API_KEY:-}')
    expect(compose).toContain('- AUDIOTOOL_PAT')
  })

  it('routes the production SPA API paths to the correct internal services', () => {
    const nginx = read('./nginx.conf')
    expect(nginx).toContain('proxy_pass http://agent:3022/api/projects/')
    expect(nginx).toContain('proxy_pass http://agent:3022/api/producer/')
    expect(nginx).toContain('proxy_pass http://chat:3021/api/')
  })
})
