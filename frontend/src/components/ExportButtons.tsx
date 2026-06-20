'use client';

import { useState } from 'react';
import { TimelineItem, TIMELINE_LABELS, TIMELINE_TYPES, Project } from '@/lib/types';
import { downloadExport } from '@/lib/api';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  project: Project;
  allItems: TimelineItem[];
}

export default function ExportButtons({ project, allItems }: Props) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleServerExport = async (format: 'excel' | 'pdf') => {
    setLoading(format);
    try {
      await downloadExport(project.id, format);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(null);
    }
  };

  const handleClientExcel = () => {
    const rows: (string | number)[][] = [
      ['Project ID', project.project_id],
      ['Project Title', project.title],
      ['Project End Date', project.end_date || ''],
      [],
      ['Timeline', 'Title', 'Status', 'Start Date', 'Due Date', 'Description', 'Custom Fields'],
    ];

    allItems.forEach((item) => {
      const custom = item.custom_fields
        ? Object.entries(item.custom_fields).map(([k, v]) => `${k}: ${v}`).join('; ')
        : '';
      rows.push([
        TIMELINE_LABELS[item.timeline_type],
        item.title,
        item.status,
        item.start_date || '',
        item.due_date || '',
        item.description || '',
        custom,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timeline');
    XLSX.writeFile(wb, `timeline_${project.project_id}.xlsx`);
  };

  const handleClientPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(project.title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Project ID: ${project.project_id}`, 14, 28);
    if (project.end_date) {
      doc.text(`End Date: ${project.end_date}`, 14, 34);
    }

    let y = project.end_date ? 42 : 36;

    TIMELINE_TYPES.forEach((type) => {
      const typeItems = allItems.filter((i) => i.timeline_type === type);
      if (typeItems.length === 0) return;

      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(12);
      doc.text(TIMELINE_LABELS[type], 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [['Title', 'Status', 'Start', 'Due']],
        body: typeItems.map((item) => [
          item.title,
          item.status,
          item.start_date || '-',
          item.due_date || '-',
        ]),
        margin: { left: 14 },
        styles: { fontSize: 8 },
      });

      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    });

    doc.save(`timeline_${project.project_id}.pdf`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={handleClientExcel} disabled={!!loading}>
        <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Excel
      </button>
      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={handleClientPdf} disabled={!!loading}>
        <svg className="h-3.5 w-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        PDF
      </button>
      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => handleServerExport('excel')} disabled={!!loading}>
        {loading === 'excel' ? 'Exporting...' : 'CSV'}
      </button>
    </div>
  );
}
