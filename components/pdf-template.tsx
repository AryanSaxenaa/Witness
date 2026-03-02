import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer'
import type { EvidentiaryMemo } from '@/types'
import { formatDate, scoreToPercentage } from '@/lib/utils'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 56,
    color: '#111',
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 6,
    fontSize: 8,
    color: '#666',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
    marginBottom: 16,
  },
  stamp: {
    borderWidth: 1,
    borderColor: '#000',
    padding: '3 6',
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  disclaimerBox: {
    borderLeftWidth: 3,
    borderLeftColor: '#581C1C',
    backgroundColor: '#fff5f5',
    padding: 8,
    marginBottom: 16,
    fontSize: 8,
    color: '#581C1C',
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    color: '#666',
    marginBottom: 6,
    marginTop: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
    paddingBottom: 3,
  },
  body: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  scoreBlock: {
    borderLeftWidth: 3,
    borderLeftColor: '#581C1C',
    backgroundColor: '#f5f5f5',
    padding: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontFamily: 'Times-Roman',
    color: '#581C1C',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
    paddingVertical: 4,
  },
  tableHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#666',
    letterSpacing: 0.5,
  },
  listItem: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
    fontSize: 10,
  },
})

const DISCLAIMER =
  'WITNESS AI generates pre-analysis memos only. This output is not a legal document, is not admissible as evidence, and is not a substitute for qualified legal counsel. All outputs must be reviewed by a trained human analyst before use in any legal proceeding.'

interface PDFTemplateProps {
  memo: EvidentiaryMemo
}

export function WitnessPDFDocument({ memo }: PDFTemplateProps) {
  return (
    <Document
      title={`WITNESS — ${memo.caseRef}`}
      author="WITNESS AI"
      subject="Evidentiary Pre-Analysis Memo"
      keywords="ICC, evidence, pre-analysis, AI"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 8, letterSpacing: 1, color: '#666' }}>
              Pre-Analysis Memo · WITNESS AI
            </Text>
            <Text style={{ fontSize: 14, fontFamily: 'Times-Roman', marginTop: 3 }}>
              {memo.caseRef}
            </Text>
            <Text style={{ fontSize: 8, color: '#666', marginTop: 2 }}>
              Generated: {formatDate(memo.generatedAt)}
            </Text>
          </View>
          <Text style={styles.stamp}>DRAFT</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text>{DISCLAIMER}</Text>
        </View>

        {/* Title */}
        <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 12 }}>
          Evidentiary Correlation Summary
        </Text>

        {/* Executive Summary */}
        <Text style={styles.sectionTitle}>EXECUTIVE SUMMARY</Text>
        <Text style={styles.body}>{memo.executiveSummary}</Text>

        {/* Veracity Score */}
        <View style={styles.scoreBlock}>
          <View>
            <Text style={{ fontSize: 8, color: '#666', letterSpacing: 1 }}>
              VERACITY SCORE
            </Text>
            <Text style={styles.scoreValue}>{scoreToPercentage(memo.veracity.score)}</Text>
          </View>
          <Text style={{ fontSize: 9, color: '#555', maxWidth: 300 }}>{memo.veracity.basis}</Text>
        </View>

        {/* Entity Map */}
        <Text style={styles.sectionTitle}>ENTITY MAP</Text>
        <View style={[styles.tableRow, { borderBottomWidth: 1 }]}>
          <Text style={[styles.tableHeader, { flex: 3 }]}>Entity</Text>
          <Text style={[styles.tableHeader, { flex: 1.5 }]}>Type</Text>
          <Text style={[styles.tableHeader, { flex: 1.5 }]}>Weight</Text>
          <Text style={[styles.tableHeader, { flex: 1 }]}>Confidence</Text>
        </View>
        {memo.entityMap.map((entity, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={{ flex: 3, fontSize: 9 }}>{entity.text}</Text>
            <Text style={{ flex: 1.5, fontSize: 9, color: '#581C1C' }}>{entity.type}</Text>
            <Text style={{ flex: 1.5, fontSize: 9 }}>{entity.evidentiaryWeight}</Text>
            <Text style={{ flex: 1, fontSize: 9, color: '#666' }}>
              {(entity.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        ))}

        {/* Corroboration Analysis */}
        <Text style={styles.sectionTitle}>CORROBORATION ANALYSIS</Text>
        <Text style={styles.body}>{memo.corroborationAnalysis}</Text>

        {/* Flagged Inconsistencies */}
        {memo.flaggedInconsistencies.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>FLAGGED INCONSISTENCIES</Text>
            {memo.flaggedInconsistencies.map((item, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={{ color: '#581C1C' }}>•</Text>
                <Text style={{ flex: 1 }}>{item}</Text>
              </View>
            ))}
          </>
        )}

        {/* Recommended Follow-Up */}
        <Text style={styles.sectionTitle}>RECOMMENDED FOLLOW-UP</Text>
        {memo.recommendedFollowUp.map((action, i) => (
          <View key={i} style={styles.listItem}>
            <Text style={{ color: '#581C1C', minWidth: 14 }}>{i + 1}.</Text>
            <Text style={{ flex: 1 }}>{action}</Text>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>AI-ASSISTED PRE-ANALYSIS | NOT A LEGAL DOCUMENT</Text>
          <Text>WITNESS v1.0 · {memo.caseRef}</Text>
          <Text render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
