import React from 'react';
import { ProcessStageData } from '../../hooks/useReports';

interface ProcessStatusChartProps {
  data: {
    byStage: ProcessStageData[];
    processes: any[];
  };
}

// Colors for SVG (actual hex values)
const stageColorsSVG: Record<string, string> = {
  UPLOAD: '#3b82f6',           // blue-500
  METADATA_EXTRACTION: '#a855f7', // purple-500
  KEYWORD_ENHANCEMENT: '#6366f1', // indigo-500
  DATABASE_SEARCH: '#06b6d4',     // cyan-500
  MANUAL_SEARCH: '#14b8a6',       // teal-500
  VALIDATION: '#f97316',          // orange-500
  RECOMMENDATIONS: '#f59e0b',     // amber-500
  SHORTLIST: '#84cc16',           // lime-500
  EXPORT: '#22c55e',              // green-500
};

// Colors for legend (Tailwind classes)
const stageColors: Record<string, string> = {
  UPLOAD: 'bg-blue-500',
  METADATA_EXTRACTION: 'bg-purple-500',
  KEYWORD_ENHANCEMENT: 'bg-indigo-500',
  DATABASE_SEARCH: 'bg-cyan-500',
  MANUAL_SEARCH: 'bg-teal-500',
  VALIDATION: 'bg-orange-500',
  RECOMMENDATIONS: 'bg-amber-500',
  SHORTLIST: 'bg-lime-500',
  EXPORT: 'bg-green-500',
};

const stageLabels: Record<string, string> = {
  UPLOAD: 'Upload & Extract',
  METADATA_EXTRACTION: 'Metadata Extraction',
  KEYWORD_ENHANCEMENT: 'Keyword Enhancement',
  DATABASE_SEARCH: 'Database Search',
  MANUAL_SEARCH: 'Manual Search',
  VALIDATION: 'Validation',
  RECOMMENDATIONS: 'Recommendations',
  SHORTLIST: 'Shortlist',
  EXPORT: 'Export',
};

export function ProcessStatusChart({ data }: ProcessStatusChartProps) {
  const { byStage } = data;

  if (!byStage || byStage.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No process data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pie Chart Visualization */}
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {byStage.reduce((acc, item) => {
              const startAngle = acc.angle;
              const angle = (item.percentage / 100) * 360;
              const endAngle = startAngle + angle;
              
              const x1 = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
              const y1 = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
              const x2 = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
              const y2 = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);
              
              const largeArc = angle > 180 ? 1 : 0;
              
              const pathData = [
                `M 50 50`,
                `L ${x1} ${y1}`,
                `A 40 40 0 ${largeArc} 1 ${x2} ${y2}`,
                `Z`
              ].join(' ');
              
              acc.elements.push(
                <path
                  key={item.stage}
                  d={pathData}
                  fill={stageColorsSVG[item.stage] || '#9ca3af'}
                  opacity="0.9"
                  stroke="#fff"
                  strokeWidth="0.5"
                />
              );
              
              acc.angle = endAngle;
              return acc;
            }, { angle: 0, elements: [] as React.ReactNode[] }).elements}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {byStage.map((item) => (
          <div key={item.stage} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${stageColors[item.stage] || 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {stageLabels[item.stage] || item.stage}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {item.count} ({item.percentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
