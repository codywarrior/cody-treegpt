'use client';

import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export function useExportPDF() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPDF = useCallback(async () => {
    setIsExporting(true);

    try {
      // Get the main content container
      const element = document.getElementById('pdf-content') as HTMLElement;
      if (!element) {
        throw new Error('Content container not found');
      }

      // Hide elements that shouldn't be in PDF
      const excludeElements = element.querySelectorAll('.pdf-exclude');
      const originalDisplays: string[] = [];
      excludeElements.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        originalDisplays[index] = htmlEl.style.display;
        htmlEl.style.display = 'none';
      });

      // Configure html2canvas options for better quality and styling preservation
      const canvas = await html2canvas(element, {
        scale: 2, // Higher resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        logging: false,
        foreignObjectRendering: true,
        removeContainer: false,
        ignoreElements: el => {
          return el.classList.contains('pdf-exclude');
        },
        // Enhance styling preservation and fix unsupported CSS properties
        onclone: clonedDoc => {
          // List of unsupported color functions
          const unsupportedColorFunctions = [
            'lab(',
            'lch(',
            'oklch(',
            'oklab(',
            'color(',
            'hwb(',
          ];

          // Ensure all computed styles are applied to elements for exact UI matching
          const originalElements = element.querySelectorAll('*');
          const clonedElements = clonedDoc.querySelectorAll('*');

          originalElements.forEach((originalEl, index) => {
            const clonedEl = clonedElements[index] as HTMLElement;
            if (clonedEl && originalEl instanceof HTMLElement) {
              const computedStyle = window.getComputedStyle(originalEl);

              // Apply ALL computed styles for exact matching
              const allStyleProps = Array.from(computedStyle);

              allStyleProps.forEach(prop => {
                const value = computedStyle.getPropertyValue(prop);
                if (value && value !== 'initial' && value !== 'inherit') {
                  // Skip unsupported color functions
                  if (
                    !unsupportedColorFunctions.some(func =>
                      value.includes(func)
                    )
                  ) {
                    try {
                      clonedEl.style.setProperty(prop, value, 'important');
                    } catch (e) {
                      // Skip properties that can't be set
                    }
                  } else {
                    // Replace unsupported color functions with fallbacks
                    let fallbackValue = value;
                    unsupportedColorFunctions.forEach(func => {
                      const regex = new RegExp(
                        `${func.replace('(', '\\(')}[^)]+\\)`,
                        'g'
                      );
                      fallbackValue = fallbackValue.replace(
                        regex,
                        prop.includes('background') ? '#ffffff' : '#000000'
                      );
                    });
                    try {
                      clonedEl.style.setProperty(
                        prop,
                        fallbackValue,
                        'important'
                      );
                    } catch (e) {
                      // Skip properties that can't be set
                    }
                  }
                }
              });
            }
          });

          // Remove any CSS that might contain unsupported color functions
          const styleSheets = clonedDoc.styleSheets;
          for (let i = 0; i < styleSheets.length; i++) {
            try {
              const sheet = styleSheets[i] as CSSStyleSheet;
              if (sheet.cssRules) {
                for (let j = sheet.cssRules.length - 1; j >= 0; j--) {
                  const rule = sheet.cssRules[j];
                  if (rule.cssText) {
                    const hasUnsupportedColor = unsupportedColorFunctions.some(
                      func => rule.cssText.includes(func)
                    );
                    if (hasUnsupportedColor) {
                      sheet.deleteRule(j);
                    }
                  }
                }
              }
            } catch (e) {
              // Ignore cross-origin stylesheet errors
            }
          }

          // Also remove inline styles with unsupported color functions
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            if (htmlEl.style && htmlEl.style.cssText) {
              let cssText = htmlEl.style.cssText;

              // Replace unsupported color functions with fallback colors
              unsupportedColorFunctions.forEach(func => {
                const regex = new RegExp(
                  `${func.replace('(', '\\(')}[^)]+\\)`,
                  'g'
                );
                cssText = cssText.replace(regex, '#000000');
              });

              if (cssText !== htmlEl.style.cssText) {
                htmlEl.style.cssText = cssText;
              }
            }
          });
        },
      });

      // Calculate PDF dimensions
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      // Add first page
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeight;

      // Add additional pages if content is longer than one page
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          position,
          imgWidth,
          imgHeight
        );
        heightLeft -= pageHeight;
      }

      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const filename = `gptree-conversation-${dateStr}.pdf`;

      // Save the PDF
      pdf.save(filename);

      // Restore hidden elements
      excludeElements.forEach((el, index) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = originalDisplays[index] || '';
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      // Restore hidden elements in case of error
      const excludeElements = document.querySelectorAll('.pdf-exclude');
      excludeElements.forEach(el => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.display = '';
      });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportToPDF,
    isExporting,
  };
}
