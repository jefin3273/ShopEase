import React, { useState } from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FileDown, FileSpreadsheet, Share2, Mail } from 'lucide-react';
import { exportElementToPDF, exportRowsToCSV } from '../lib/exportUtils';
import api from '../services/api';
import { toast } from './ui/use-toast';
import { captureAsCanvas } from '../utils/pdfExportHelper';

export type CsvGroup = {
  label: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
  filename?: string;
};

interface ExportToolbarProps {
  targetRef?: React.RefObject<HTMLElement>;
  pdfFilename?: string;
  csvGroups?: CsvGroup[];
  size?: 'sm' | 'default';
  onShare?: () => void;
  shareUrl?: string;
}

const ExportToolbar: React.FC<ExportToolbarProps> = ({
  targetRef,
  pdfFilename,
  csvGroups = [],
  size = 'default',
  onShare,
  shareUrl
}) => {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  const onExportPDF = async () => {
    if (!targetRef?.current) return;
    await exportElementToPDF(targetRef.current, { filename: pdfFilename });
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copied to clipboard!');
    } else {
      // Fallback - copy current URL
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleEmailReport = async () => {
    if (!targetRef?.current) {
      toast({
        title: 'Error',
        description: 'No content available to email',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    try {
      // First, generate PDF from current view using the helper that handles OKLCH colors
      const reportFilename = pdfFilename || `report-${new Date().toISOString().slice(0, 10)}.pdf`;

      // Use the captureAsCanvas helper that properly converts OKLCH colors
      // Reduce scale to 1.5 for smaller file size (was 2)
      const canvas = await captureAsCanvas(targetRef.current, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      });

      // Import jsPDF dynamically
      const jsPDF = (await import('jspdf')).default;

      // Compress image to reduce size - use JPEG with quality 0.8
      const imgData = canvas.toDataURL('image/jpeg', 0.8);

      // Calculate dimensions for A4 format
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: imgHeight > pageHeight ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // If content is taller than one page, scale it down to fit
      let finalHeight = imgHeight;
      let finalWidth = imgWidth;
      if (imgHeight > pageHeight) {
        finalHeight = pageHeight;
        finalWidth = (canvas.width * pageHeight) / canvas.height;
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, finalWidth, finalHeight);
      const pdfBlob = pdf.output('blob');

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]); // Remove data:application/pdf;base64, prefix
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdfBlob);
      const pdfBase64 = await base64Promise;

      console.log('[Email] PDF size:', Math.round(pdfBase64.length / 1024), 'KB');

      // Prepare CSV data if available
      let csvData = '';
      if (csvGroups && csvGroups.length > 0) {
        // Combine all CSV groups into one
        csvData = csvGroups.map(group => {
          const rows = [group.headers, ...group.rows];
          return `\n=== ${group.label} ===\n` +
            rows.map(row => row.map(cell => {
              const str = String(cell ?? '');
              return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(',')).join('\n');
        }).join('\n\n');
      }

      // Send via API
      const response = await api.post('/api/reports/send-now', {
        reportType: 'performance',
        config: {
          format: 'pdf',
          includeCharts: true,
        },
        recipients: [email],
        pdfData: pdfBase64,
        csvData: csvData || undefined,
        reportName: reportFilename.replace('.pdf', ''),
      });

      if (response.data.success) {
        toast({
          title: 'Success!',
          description: `Report has been sent to ${email}`,
        });
        setEmailDialogOpen(false);
        setEmail('');
      } else {
        throw new Error(response.data.message || 'Failed to send email');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      const errorMessage = (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        || (error as { message?: string })?.message
        || 'Please check your email configuration and try again.';
      toast({
        title: 'Failed to send email',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const hasCsv = csvGroups && csvGroups.length > 0;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* PDF Export */}
        {targetRef && (
          <Button variant="outline" size={size} onClick={onExportPDF}>
            <FileDown className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        )}

        {/* CSV Export */}
        {hasCsv && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size={size}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {csvGroups.map((g, idx) => (
                <DropdownMenuItem key={idx} onClick={() => exportRowsToCSV(g.headers, g.rows, g.filename)}>
                  {g.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Share & Email Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size={size}>
              <Share2 className="w-4 h-4 mr-2" /> Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Email Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Report</DialogTitle>
            <DialogDescription>
              Enter the email address where you'd like to receive this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEmailReport} disabled={!email || sending}>
              {sending ? 'Sending...' : 'Send Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExportToolbar;
