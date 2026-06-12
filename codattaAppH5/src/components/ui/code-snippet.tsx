import { useEffect, useRef } from 'react'
import { cn } from '@udecode/cn'

import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import 'highlight.js/styles/atom-one-dark.css'

hljs.registerLanguage('json', json)

export default function CodeSnippet(props: { code: string; className?: string }) {
  const codeRef = useRef<HTMLElement>(null)

  useEffect(() => {
    codeRef.current && hljs.highlightElement(codeRef.current)
  }, [])

  return (
    <pre>
      <code ref={codeRef} className={cn('json', props.className)}>
        {props.code}
      </code>
    </pre>
  )
}
