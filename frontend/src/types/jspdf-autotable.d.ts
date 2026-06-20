declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: string[][];
    body?: (string | number)[][];
    margin?: { left?: number; right?: number; top?: number; bottom?: number };
    styles?: Record<string, unknown>;
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
