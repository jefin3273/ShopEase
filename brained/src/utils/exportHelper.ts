/**
 * Unified Export Helper
 * Centralized utility for exporting data in various formats
 */

import api from '../services/api';

export interface ExportOptions {
  from?: string;
  to?: string;
  pageURL?: string;
  device?: string;
  cohort?: string;
  variant?: string;
  type?: string;
  includeCharts?: boolean;
  includeBehavior?: boolean;
  includeErrors?: boolean;
}

/**
 * Download a blob as a file
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
};

/**
 * Export analytics data as CSV
 */
export const exportAnalyticsCSV = async (options: ExportOptions = {}) => {
  try {
    const response = await api.get('/api/analytics/export/csv', {
      params: options,
      responseType: 'blob',
    });
    
    const filename = `analytics_${options.type || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadBlob(response.data, filename);
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to export CSV:', error);
    throw new Error(error.response?.data?.message || 'Failed to export CSV');
  }
};

/**
 * Export analytics data as PDF
 */
export const exportAnalyticsPDF = async (options: ExportOptions = {}) => {
  try {
    const response = await api.get('/api/analytics/export/pdf', {
      params: options,
      responseType: 'blob',
    });
    
    const filename = `analytics_report_${new Date().toISOString().slice(0, 10)}.pdf`;
    downloadBlob(response.data, filename);
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to export PDF:', error);
    throw new Error(error.response?.data?.message || 'Failed to export PDF');
  }
};

/**
 * Export funnel data
 */
export const exportFunnelData = async (funnelId: string, format: 'csv' | 'pdf', options: ExportOptions = {}) => {
  try {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    
    const response = await api.get(
      `/api/funnels/${funnelId}/export/${format}?${params.toString()}`,
      { responseType: 'blob' }
    );
    
    const filename = `funnel_${funnelId}_${new Date().toISOString().slice(0, 10)}.${format}`;
    downloadBlob(response.data, filename);
    
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to export funnel ${format}:`, error);
    throw new Error(error.response?.data?.message || `Failed to export funnel ${format}`);
  }
};

/**
 * Export cohort data
 */
export const exportCohortData = async (cohortId: string, format: 'csv' | 'pdf', options: ExportOptions = {}) => {
  try {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    
    const response = await api.get(
      `/api/cohorts/${cohortId}/export/${format}?${params.toString()}`,
      { responseType: 'blob' }
    );
    
    const filename = `cohort_${cohortId}_${new Date().toISOString().slice(0, 10)}.${format}`;
    downloadBlob(response.data, filename);
    
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to export cohort ${format}:`, error);
    throw new Error(error.response?.data?.message || `Failed to export cohort ${format}`);
  }
};

/**
 * Export data from any collection to CSV
 */
export const exportDataToCSV = (
  data: any[],
  columns: { key: string; label: string }[],
  filename: string
) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Create CSV headers
  const headers = columns.map(col => col.label);
  
  // Create CSV rows
  const rows = data.map(item => 
    columns.map(col => {
      const value = col.key.split('.').reduce((obj, key) => obj?.[key], item);
      
      // Handle different value types
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
  );

  // Combine headers and rows
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
  
  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
  
  return { success: true };
};

/**
 * Send report via email
 */
export const sendReportViaEmail = async (
  reportType: string,
  config: ExportOptions,
  recipients: string[]
) => {
  try {
    const response = await api.post('/api/reports/send-now', {
      reportType,
      config,
      recipients,
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Failed to send report via email:', error);
    throw new Error(error.response?.data?.message || 'Failed to send report');
  }
};

/**
 * Schedule a report
 */
export const scheduleReport = async (reportConfig: any) => {
  try {
    const response = await api.post('/api/reports/scheduled', reportConfig);
    return response.data;
  } catch (error: any) {
    console.error('Failed to schedule report:', error);
    throw new Error(error.response?.data?.message || 'Failed to schedule report');
  }
};

/**
 * Get scheduled reports
 */
export const getScheduledReports = async (projectId: string = 'default') => {
  try {
    const response = await api.get('/api/reports/scheduled', {
      params: { projectId },
    });
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch scheduled reports:', error);
    throw new Error(error.response?.data?.message || 'Failed to fetch scheduled reports');
  }
};

/**
 * Delete a scheduled report
 */
export const deleteScheduledReport = async (reportId: string) => {
  try {
    const response = await api.delete(`/api/reports/scheduled/${reportId}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to delete scheduled report:', error);
    throw new Error(error.response?.data?.message || 'Failed to delete scheduled report');
  }
};

/**
 * Run a scheduled report immediately
 */
export const runScheduledReportNow = async (reportId: string) => {
  try {
    const response = await api.post(`/api/reports/scheduled/${reportId}/run-now`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to run scheduled report:', error);
    throw new Error(error.response?.data?.message || 'Failed to run scheduled report');
  }
};

/**
 * Check if email is configured
 */
export const checkEmailConfig = async () => {
  try {
    const response = await api.get('/api/reports/email-config');
    return response.data;
  } catch (error: any) {
    console.error('Failed to check email config:', error);
    return { configured: false, message: 'Failed to check email configuration' };
  }
};

/**
 * Send a test email
 */
export const sendTestEmail = async (email: string) => {
  try {
    const response = await api.post('/api/reports/test-email', { email });
    return response.data;
  } catch (error: any) {
    console.error('Failed to send test email:', error);
    throw new Error(error.response?.data?.message || 'Failed to send test email');
  }
};
