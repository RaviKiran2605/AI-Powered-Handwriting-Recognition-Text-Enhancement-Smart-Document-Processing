import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

export const exportToPDF = async (text: string, filename: string) => {
  try {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 50;
    const lineHeight = fontSize * 1.2;

    // Split text into words and manage line wrapping
    const words = text.split(/\s+/);
    let currentLine = '';
    let y = height - margin;
    let currentPage = page;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const textWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);

      if (textWidth > width - 2 * margin) {
        // Draw current line and move to next line
        currentPage.drawText(currentLine, {
          x: margin,
          y,
          size: fontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });

        y -= lineHeight;
        currentLine = word;

        // Check if we need a new page
        if (y < margin) {
          currentPage = pdfDoc.addPage();
          y = currentPage.getHeight() - margin;
        }
      } else {
        currentLine = testLine;
      }
    }

    // Draw the last line if any
    if (currentLine) {
      currentPage.drawText(currentLine, {
        x: margin,
        y,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    saveAs(blob, `${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
};

export const exportToDoc = async (text: string, filename: string) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: text,
                size: 24, // 12pt font
              }),
            ],
          }),
        ],
      }],
    });
    
    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, `${filename}.docx`);
  } catch (error) {
    console.error('Error exporting to DOC:', error);
    throw new Error('Failed to export DOC');
  }
};

export const exportToTxt = (text: string, filename: string) => {
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${filename}.txt`);
  } catch (error) {
    console.error('Error exporting to TXT:', error);
    throw new Error('Failed to export TXT');
  }
};

export const exportToODT = async (text: string) => {
  try {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: text,
            style: 'normal'
          })
        ]
      }]
    });
    
    const buffer = await Packer.toBlob(doc);
    saveAs(buffer, 'document.odt');
  } catch (error) {
    console.error('Error exporting to ODT:', error);
    throw new Error('Failed to export ODT');
  }
};

// Utility to export the project overview as a PDF
export const exportProjectOverviewPDF = async () => {
  try {
    const response = await fetch('/project_overview.txt');
    const text = await response.text();
    await exportToPDF(text, 'DocuAI_Project_Overview');
  } catch (error) {
    console.error('Failed to export project overview PDF:', error);
    throw error;
  }
};