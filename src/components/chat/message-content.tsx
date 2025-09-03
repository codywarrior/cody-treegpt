'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  if (isUser) {
    return (
      <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
        {content}
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            return !isInline && match ? (
              <pre className="bg-gray-100 dark:bg-gray-800 rounded-md p-3 overflow-x-auto">
                <code
                  className={className}
                  {...(props as React.HTMLAttributes<HTMLElement>)}
                >
                  {children}
                </code>
              </pre>
            ) : (
              <code
                className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm"
                {...(props as React.HTMLAttributes<HTMLElement>)}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
