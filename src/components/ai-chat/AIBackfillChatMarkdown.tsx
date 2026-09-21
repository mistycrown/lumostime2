/**
 * @file AIBackfillChatMarkdown.tsx
 * @input React Markdown component props
 * @output Shared Markdown element styling for AI chat messages
 * @pos Component Support (AI Integration)
 * @description Keeps the presentation-only Markdown renderer configuration separate from chat orchestration.
 */
import React from 'react';

export const CHAT_MARKDOWN_COMPONENTS = {
  h1: ({ node, ...props }: any) => <h1 className="mb-3 mt-1 text-[1.05rem] font-bold leading-7" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="mb-3 mt-1 text-base font-bold leading-7" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="mb-2 mt-1 text-[15px] font-semibold leading-6" {...props} />,
  p: ({ node, ...props }: any) => <p className="mb-3 last:mb-0 leading-6" {...props} />,
  strong: ({ node, ...props }: any) => (
    <strong
      className="rounded-[0.25rem] bg-[rgba(180,138,82,0.14)] px-1 py-[0.05rem] font-black text-[1.02em] text-stone-950"
      {...props}
    />
  ),
  em: ({ node, ...props }: any) => <em className="italic" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="my-3 list-disc space-y-1 pl-5" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="my-3 list-decimal space-y-1 pl-5" {...props} />,
  li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote
      className="my-3 rounded-r-[0.7rem] border-l-[3px] border-[rgba(120,113,108,0.38)] bg-[rgba(0,0,0,0.03)] py-1.5 pl-3 pr-2 italic"
      {...props}
    />
  ),
  code: ({ node, inline, className, children, ...props }: any) => (
    inline
      ? (
        <code
          className="rounded-[0.35rem] bg-[rgba(0,0,0,0.08)] px-1.5 py-0.5 text-[0.92em]"
          {...props}
        >
          {children}
        </code>
      )
      : (
        <code className={className} {...props}>
          {children}
        </code>
      )
  ),
  pre: ({ node, ...props }: any) => (
    <pre
      className="my-3 overflow-x-auto rounded-[0.75rem] bg-[rgba(0,0,0,0.08)] px-3 py-2 text-[13px] leading-6"
      {...props}
    />
  ),
  hr: ({ node, ...props }: any) => <hr className="my-4 border-[rgba(120,113,108,0.22)]" {...props} />,
  a: ({ node, ...props }: any) => <a className="underline underline-offset-2" {...props} />
};
