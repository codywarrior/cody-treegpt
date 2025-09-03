'use client';

export interface StreamingNode {
  id: string;
  text: string;
  onUpdate?: (node: StreamingNode) => void;
  onComplete?: (node: StreamingNode) => void;
}

export interface StreamingCallbacks {
  onNodeCreated?: (node: StreamingNode) => void;
  onContent?: (content: string) => void;
  onComplete?: (node: StreamingNode) => void;
  onError?: (error: string) => void;
}

interface StreamingResponse {
  type: 'node' | 'content' | 'complete' | 'error';
  node?: {
    id: string;
    role: 'assistant';
    text: string;
    parentId: string;
    conversationId: string;
    createdAt: string;
  };
  content?: string;
  error?: string;
}

export class StreamingService {
  private eventSource: EventSource | null = null;

  async streamAIReply(
    nodeId: string,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `/api/nodes/${nodeId}/ai-reply`;

      // Use fetch with POST method for EventSource since we need POST
      fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error('No response body');
          }

          const decoder = new TextDecoder();

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const data: StreamingResponse = JSON.parse(line.slice(6));

                      switch (data.type) {
                        case 'node':
                          if (data.node) {
                            callbacks.onNodeCreated?.({
                              id: data.node.id,
                              text: data.node.text,
                            });
                          }
                          break;
                        case 'content':
                          callbacks.onContent?.(data.content || '');
                          break;
                        case 'complete':
                          if (data.node) {
                            callbacks.onComplete?.({
                              id: data.node.id,
                              text: data.node.text,
                            });
                          }
                          resolve();
                          return;
                        case 'error':
                          callbacks.onError?.(data.error || 'Unknown error');
                          reject(new Error(data.error || 'Unknown error'));
                          return;
                      }
                    } catch (parseError) {
                      console.error(
                        'Failed to parse streaming response:',
                        parseError
                      );
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Stream processing error:', error);
              callbacks.onError?.('Stream processing error');
              reject(error);
            }
          };

          processStream();
        })
        .catch(error => {
          console.error('Fetch error:', error);
          callbacks.onError?.('Connection error');
          reject(error);
        });
    });
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

export const streamingService = new StreamingService();
