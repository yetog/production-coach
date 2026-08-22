import { describe, expect, it } from 'vitest'
import { parseAgentSse } from './agent-stream'

describe('agent SSE protocol', () => {
  it('parses text, tool, and terminal events while ignoring keep-alives', () => {
    expect(parseAgentSse(': keep-alive\n\ndata: {"type":"text_delta","text":"Yo"}\n\ndata: {"type":"done","content":"Yo"}\n'))
      .toEqual([
        { type: 'text_delta', text: 'Yo' },
        { type: 'done', content: 'Yo' },
      ])
  })

  it('skips malformed or non-data records', () => {
    expect(parseAgentSse('event: message\ndata: nope\n\ndata: {"type":"tool_call"}\n'))
      .toEqual([{ type: 'tool_call' }])
  })
})
