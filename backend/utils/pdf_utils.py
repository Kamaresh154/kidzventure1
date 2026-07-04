import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

PRIMARY = colors.HexColor('#4f46e5')


def format_currency(n):
    try:
        n = float(n or 0)
    except (TypeError, ValueError):
        n = 0
    return 'Rs. ' + '{:,.2f}'.format(n)


def generate_document_pdf(doc_type, doc_no, date_str, customer_lines, items, totals, extra_lines=None):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=20 * mm, rightMargin=20 * mm,
    )
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], textColor=PRIMARY, fontSize=18, spaceAfter=2)
    sub_style = ParagraphStyle('SubStyle', parent=styles['Normal'], textColor=colors.HexColor('#666666'), fontSize=9)
    right_title = ParagraphStyle('RightTitle', parent=styles['Heading2'], alignment=TA_RIGHT, fontSize=14, textColor=colors.HexColor('#333333'))
    right_sub = ParagraphStyle('RightSub', parent=styles['Normal'], alignment=TA_RIGHT, fontSize=9, textColor=colors.HexColor('#666666'))
    info_style = ParagraphStyle('Info', parent=styles['Normal'], fontSize=9, leading=13)
    grand_style = ParagraphStyle('Grand', parent=styles['Heading2'], alignment=TA_RIGHT, textColor=PRIMARY, fontSize=14)
    footer_style = ParagraphStyle('Footer', parent=styles['Normal'], alignment=TA_CENTER, fontSize=8, textColor=colors.HexColor('#999999'))

    elements = []

    header = Table(
        [
            [Paragraph('KidzVenture', title_style), Paragraph(doc_type, right_title)],
            [Paragraph('Montessori Materials &amp; Educational Products', sub_style), Paragraph(doc_no, right_sub)],
            ['', Paragraph('Date: ' + (date_str or ''), right_sub)],
        ],
        colWidths=[95 * mm, 75 * mm],
    )
    header.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    elements.append(header)
    elements.append(Spacer(1, 3 * mm))
    elements.append(Table([['']], colWidths=[170 * mm], rowHeights=[1],
                           style=TableStyle([('LINEBELOW', (0, 0), (-1, -1), 1.2, PRIMARY)])))
    elements.append(Spacer(1, 6 * mm))

    left_info = Paragraph('<b>Bill To:</b><br/>' + '<br/>'.join([c for c in customer_lines if c]), info_style)
    right_info = Paragraph('<br/>'.join([e for e in (extra_lines or []) if e]), info_style)
    info_table = Table([[left_info, right_info]], colWidths=[95 * mm, 75 * mm])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f9f9f9')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#eeeeee')),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(info_table)
    elements.append(Spacer(1, 6 * mm))

    data = [['#', 'Item', 'Qty', 'Price', 'Total']]
    for i, item in enumerate(items or []):
        try:
            qty = float(item.get('qty', 1))
        except (TypeError, ValueError):
            qty = 1
        try:
            price = float(item.get('price', 0))
        except (TypeError, ValueError):
            price = 0
        data.append([str(i + 1), item.get('name', ''), str(qty), format_currency(price), format_currency(qty * price)])

    items_table = Table(data, colWidths=[10 * mm, 75 * mm, 20 * mm, 32.5 * mm, 32.5 * mm])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 4 * mm))

    totals_rows = [['Subtotal', format_currency(totals.get('subtotal', 0))]]
    if totals.get('discount'):
        totals_rows.append(['Discount', '-' + format_currency(totals['discount'])])
    if totals.get('tax'):
        totals_rows.append(['Tax', format_currency(totals['tax'])])
    totals_table = Table(totals_rows, colWidths=[137.5 * mm, 32.5 * mm])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(totals_table)
    elements.append(Spacer(1, 2 * mm))
    elements.append(Paragraph('Grand Total: ' + format_currency(totals.get('grand_total', 0)), grand_style))
    elements.append(Spacer(1, 12 * mm))

    elements.append(Paragraph('Thank you for your business!', footer_style))
    elements.append(Paragraph('KidzVenture Montessori Materials | Contact: info@kidzventure.com', footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer
