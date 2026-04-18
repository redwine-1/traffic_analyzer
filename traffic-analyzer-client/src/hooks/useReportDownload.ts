import { useState, useCallback } from 'react';

type ReportDownloadProps = {
    processedMetadataHistory: any[];
    fileName: string;
};

export function useReportDownload({ processedMetadataHistory, fileName }: ReportDownloadProps) {
    const [reportNotice, setReportNotice] = useState('');

    const handleDownloadReport = useCallback(() => {
        if (!processedMetadataHistory || processedMetadataHistory.length === 0) {
            setReportNotice('No data to download.');
            return;
        }

        try {
            // Determine all unique classes dynamically from total_up and total_down
            const allClasses = new Set<string>();

            processedMetadataHistory.forEach((meta) => {
                const up = meta.total_up || {};
                const down = meta.total_down || {};

                Object.keys(up).forEach((cls) => allClasses.add(cls));
                Object.keys(down).forEach((cls) => allClasses.add(cls));
            });

            const uniqueClasses = Array.from(allClasses).sort();

            // Construct headers
            const baseHeaders = [
                'frame_number',
                'timestamp',
                'processing_time',
                'total_objects_frame',
                'total_up',
                'total_down',
            ];

            const classHeaders = uniqueClasses.map(cls => `class_${cls}`);
            const headers = [...baseHeaders, ...classHeaders, 'total_count'];

            const escapeCsvString = (str: string | number | undefined | null) => {
                if (str === null || str === undefined) return '';
                const value = String(str);
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            };

            const csvRows = [headers.map(escapeCsvString).join(',')];

            processedMetadataHistory.forEach((meta) => {
                const upDict = meta.total_up || {};
                const downDict = meta.total_down || {};

                // Sum up and down dicts
                const totalUpSum = Object.values(upDict).reduce((a: any, b: any) => a + b, 0) as number;
                const totalDownSum = Object.values(downDict).reduce((a: any, b: any) => a + b, 0) as number;

                const rowData = {
                    frame_number: meta.frame,
                    timestamp: meta.timestamp,
                    processing_time: meta.speed,
                    total_objects_frame: meta.total_objects,
                    total_up: totalUpSum,
                    total_down: totalDownSum,
                } as any;

                uniqueClasses.forEach((cls) => {
                    const upCount = (upDict[cls] as number) || 0;
                    const downCount = (downDict[cls] as number) || 0;
                    rowData[`class_${cls}`] = upCount + downCount;
                });

                rowData.total_count = meta.total_count ?? (totalUpSum + totalDownSum);

                const rowValues = [...baseHeaders, ...classHeaders, 'total_count'].map(key => rowData[key]);
                csvRows.push(rowValues.map(escapeCsvString).join(','));
            });

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const downloadUrl = URL.createObjectURL(blob);
            const downloadFileName = fileName.replace(/\.[^/.]+$/, "") + "_report.csv";

            const downloadAnchor = document.createElement('a');
            downloadAnchor.href = downloadUrl;
            downloadAnchor.setAttribute('download', downloadFileName);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            document.body.removeChild(downloadAnchor);

            setTimeout(() => {
                URL.revokeObjectURL(downloadUrl);
            }, 100);

            setReportNotice('Report downloaded successfully!');
            setTimeout(() => setReportNotice(''), 3000);
        } catch (error) {
            console.error('Error generating CSV report:', error);
            setReportNotice('Failed to generate report.');
        }
    }, [processedMetadataHistory, fileName]);

    return {
        handleDownloadReport,
        reportNotice,
    };
}
