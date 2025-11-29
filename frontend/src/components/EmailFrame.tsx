import { useEffect, useRef, useState } from 'react';

interface EmailFrameProps {
    content: string;
    title?: string;
}

export function EmailFrame({ content, title = 'Email Content' }: EmailFrameProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState('auto');

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;

        const updateHeight = () => {
            try {
                if (iframe.contentWindow?.document.documentElement) {
                    const bodyHeight = iframe.contentWindow.document.body.scrollHeight;
                    const docHeight = iframe.contentWindow.document.documentElement.scrollHeight;
                    // Use the larger of the two to avoid cutting off content
                    const newHeight = Math.max(bodyHeight, docHeight);
                    setHeight(`${newHeight + 20}px`);
                }
            } catch (e) {
                // Cross-origin access error if sandbox is too strict
                console.warn('Could not resize iframe', e);
            }
        };

        // Write content
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <base target="_blank">
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                margin: 0;
                padding: 0; /* Parent handles padding */
                color: #111827;
                line-height: 1.5;
                overflow-wrap: break-word;
              }
              img { max-width: 100%; height: auto; }
              a { color: #2563eb; }
              /* Hide scrollbars in iframe as we want it to grow */
              body::-webkit-scrollbar { display: none; }
              html { scrollbar-width: none; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
            doc.close();

            // Observe resizing
            const resizeObserver = new ResizeObserver(() => updateHeight());
            if (doc.body) {
                resizeObserver.observe(doc.body);

                // Handle image loads
                const images = doc.getElementsByTagName('img');
                for (let i = 0; i < images.length; i++) {
                    images[i].onload = updateHeight;
                }

                // Initial sizing
                setTimeout(updateHeight, 100);
            }
        }
    }, [content]);

    return (
        <iframe
            ref={iframeRef}
            title={title}
            style={{
                width: '100%',
                height: height,
                border: 'none',
                display: 'block',
                overflow: 'hidden', // Hide iframe scrollbars
            }}
            // allow-same-origin is needed to access contentWindow for resizing
            sandbox="allow-same-origin allow-popups"
        />
    );
}
