import React from 'react';
import { ChallengeSession } from '../../types';

interface ConfidenceChartProps {
    session: ChallengeSession;
}

const ConfidenceChart: React.FC<ConfidenceChartProps> = ({ session }) => {
    const dataPoints = [
        { label: 'Initial', value: session.beliefStatement.initialConfidence },
        ...session.challengePath
            .filter(step => step.status === 'completed' && step.userConfidence !== undefined)
            .map((step, index) => ({ label: `${index + 1}`, value: step.userConfidence! }))
    ];

    if (dataPoints.length < 2) {
        return <div className="text-center text-gray-500">Not enough data to display a chart.</div>;
    }
    
    const width = 500;
    const height = 150;
    const padding = { top: 10, right: 10, bottom: 20, left: 30 };

    const xStep = (width - padding.left - padding.right) / (dataPoints.length - 1);
    const y = (val: number) => height - padding.bottom - ((val / 100) * (height - padding.top - padding.bottom));

    const pathData = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${padding.left + i * xStep},${y(p.value)}`).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg mx-auto">
            {/* Y-axis lines and labels */}
            {[0, 25, 50, 75, 100].map(val => (
                <g key={val}>
                    <line x1={padding.left} y1={y(val)} x2={width - padding.right} y2={y(val)} stroke="rgba(255,255,255,0.1)" />
                    <text x={padding.left - 8} y={y(val)} dy="0.32em" textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="10">{val}</text>
                </g>
            ))}
            
            {/* Line path */}
            <path d={pathData} stroke="#facc15" strokeWidth="2" fill="none" />
            
            {/* Data points */}
            {dataPoints.map((p, i) => (
                <g key={i} transform={`translate(${padding.left + i * xStep}, ${y(p.value)})`}>
                    <circle r="4" fill="#facc15" />
                    <text y="-8" textAnchor="middle" fill="#fde047" fontSize="10">{p.value}</text>
                </g>
            ))}
            
            {/* X-axis labels */}
            {dataPoints.map((p, i) => (
                <text 
                    key={i} 
                    x={padding.left + i * xStep} 
                    y={height - padding.bottom + 15} 
                    textAnchor="middle" 
                    fill="rgba(255,255,255,0.4)" 
                    fontSize="10"
                >
                    {p.label}
                </text>
            ))}
        </svg>
    );
};

export default ConfidenceChart;