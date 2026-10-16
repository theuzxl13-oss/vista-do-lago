/** Exportação de relatórios em PDF (jsPDF) e Excel (.xlsx). Bibliotecas carregadas sob demanda. */
export interface ReportTable {
  title: string
  head: string[]
  rows: (string | number)[][]
}

export async function exportPdf(fileName: string, title: string, subtitle: string, tables: ReportTable[]) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  doc.setFillColor(24, 57, 43)
  doc.rect(0, 0, pageW, 70, 'F')
  doc.setTextColor(198, 167, 106)
  doc.setFontSize(18)
  doc.text('VISTA DO LAGO', 40, 32)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.text(title, 40, 52)
  doc.setFontSize(9)
  doc.text(subtitle, pageW - 40, 52, { align: 'right' })
  let y = 95
  for (const t of tables) {
    if (y > 720) {
      doc.addPage()
      y = 50
    }
    doc.setTextColor(24, 57, 43)
    doc.setFontSize(12)
    doc.text(t.title, 40, y)
    autoTable(doc, {
      startY: y + 8,
      head: [t.head],
      body: t.rows.length ? t.rows.map((r) => r.map(String)) : [[{ content: 'Sem dados no período', colSpan: t.head.length }]] as never,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 4, textColor: [37, 37, 37] },
      headStyles: { fillColor: [104, 123, 85], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 242, 234] },
      margin: { left: 40, right: 40 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 28
  }
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120)
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')} · página ${i}/${pages}`, pageW / 2, doc.internal.pageSize.getHeight() - 20, { align: 'center' })
  }
  doc.save(fileName)
}

export async function exportExcel(fileName: string, tables: ReportTable[]) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const used = new Set<string>()
  const sheets = tables.map((t) => {
    let name = t.title.replace(/[\\/?*[\]:]/g, '').slice(0, 31) || 'Planilha'
    while (used.has(name)) name = `${name.slice(0, 28)}_${used.size}`
    used.add(name)
    return {
      sheet: name,
      data: [
        t.head.map((h) => ({ value: h, fontWeight: 'bold' as const })),
        ...t.rows.map((r) => r.map((v) => ({ value: v }))),
      ],
    }
  })
  await writeXlsxFile(sheets).toFile(fileName)
}
