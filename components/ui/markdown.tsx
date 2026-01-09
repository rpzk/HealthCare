import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

type MarkdownProps = {
  content: string
  className?: string
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn('text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          h1: (props) => (
            <h1
              {...props}
              className={cn('text-base font-semibold mt-4 first:mt-0', props.className)}
            />
          ),
          h2: (props) => (
            <h2
              {...props}
              className={cn('text-sm font-semibold mt-4 first:mt-0', props.className)}
            />
          ),
          h3: (props) => (
            <h3
              {...props}
              className={cn('text-sm font-semibold mt-3 first:mt-0', props.className)}
            />
          ),
          p: (props) => <p {...props} className={cn('mt-2 first:mt-0', props.className)} />,
          ul: (props) => <ul {...props} className={cn('mt-2 list-disc pl-5', props.className)} />,
          ol: (props) => <ol {...props} className={cn('mt-2 list-decimal pl-5', props.className)} />,
          li: (props) => <li {...props} className={cn('mt-1', props.className)} />,
          a: (props) => (
            <a
              {...props}
              className={cn('underline underline-offset-2', props.className)}
              target={props.href?.startsWith('http') ? '_blank' : props.target}
              rel={props.href?.startsWith('http') ? 'noreferrer' : props.rel}
            />
          ),
          blockquote: (props) => (
            <blockquote
              {...props}
              className={cn('mt-3 border-l-2 border-border pl-3 text-muted-foreground', props.className)}
            />
          ),
          hr: (props) => <hr {...props} className={cn('my-4 border-border', props.className)} />,
          code: ({ className, children, ...props }) => {
            const isBlock = typeof className === 'string' && className.includes('language-')

            if (!isBlock) {
              return (
                <code
                  {...props}
                  className={cn('rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]', className)}
                >
                  {children}
                </code>
              )
            }

            return (
              <code {...props} className={cn('font-mono text-xs', className)}>
                {children}
              </code>
            )
          },
          pre: (props) => (
            <pre
              {...props}
              className={cn('my-3 overflow-x-auto rounded-md border border-border bg-muted p-3', props.className)}
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
