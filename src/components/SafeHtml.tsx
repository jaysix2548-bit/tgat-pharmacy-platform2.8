"use client";

import React from "react";

interface SafeHtmlProps {
  content: string;
  className?: string;
}

export function SafeHtml({ content, className }: SafeHtmlProps) {
  if (!content) return null;

  // Split content by HTML tags securely using regex
  const tagRegex = /(<\/?[a-zA-Z0-9]+(?: [^>]*)*>)/g;
  const parts = content.split(tagRegex);

  const renderTokens = (): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    
    // Track formatting stacks
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    
    let keyCounter = 0;

    for (const part of parts) {
      if (!part) continue;

      if (part.startsWith("<") && part.endsWith(">")) {
        if (part.toLowerCase().startsWith("<img")) {
          const srcMatch = part.match(/src=["']([^"']+)["']/i);
          const src = srcMatch ? srcMatch[1] : "";
          if (src) {
            result.push(
              <img 
                key={`img-${keyCounter++}`} 
                src={src} 
                className="max-w-full h-auto mx-auto my-6 p-4 rounded-2xl border border-slate-800 bg-[#0b1329] shadow-2xl block" 
                alt="Exam Graphic"
              />
            );
          }
          continue;
        }

        const tag = part.toLowerCase().replace(/\s+/g, "");
        
        if (tag === "<b>" || tag === "<strong>") {
          isBold = true;
        } else if (tag === "</b>" || tag === "</strong>") {
          isBold = false;
        } else if (tag === "<i>" || tag === "<em>") {
          isItalic = true;
        } else if (tag === "</i>" || tag === "</em>") {
          isItalic = false;
        } else if (tag === "<u>") {
          isUnderline = true;
        } else if (tag === "</u>") {
          isUnderline = false;
        } else if (tag === "<p>") {
          // Render paragraph break if not first element
          if (result.length > 0) {
            result.push(<br key={`br-p1-${keyCounter++}`} />);
            result.push(<br key={`br-p2-${keyCounter++}`} />);
          }
        } else if (tag === "</p>") {
          // Paragraph end is a boundary, no direct action needed as opening <p> does the breaks
        } else if (tag === "<br>" || tag === "<br/>") {
          result.push(<br key={`br-${keyCounter++}`} />);
        }
        // All other HTML tags are silently stripped out for complete security (XSS prevention)
      } else {
        // Plain text token - apply active styles
        let element: React.ReactNode = part;
        const key = `txt-${keyCounter++}`;

        if (isBold) {
          element = <strong key={`b-${key}`} className="font-bold">{element}</strong>;
        }
        if (isItalic) {
          element = <em key={`i-${key}`} className="italic">{element}</em>;
        }
        if (isUnderline) {
          element = <u key={`u-${key}`} className="underline">{element}</u>;
        }

        result.push(element);
      }
    }

    return result;
  };

  return <span className={className}>{renderTokens()}</span>;
}
