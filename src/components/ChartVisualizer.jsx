import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { FileSpreadsheet, Percent, LayoutList } from 'lucide-react';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#3b82f6', '#ec4899'];

// Custom Tooltip component for matching the dark glassmorphism styling
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)'
      }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: '#f8fafc', marginBottom: '6px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ margin: 0, fontSize: '0.8rem', color: entry.color || entry.fill, display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            <span>{entry.name}:</span>
            <span style={{ fontWeight: 700 }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ChartVisualizer = ({ chartType, data, xAxis, yAxis = [], title, explanation }) => {
  if (!data || data.length === 0) {
    return (
      <div className="no-data">
        <LayoutList className="no-data-icon" size={48} />
        <div>
          <h3>No Data Available</h3>
          <p>Execute a natural language query or manual SQL to display results.</p>
        </div>
      </div>
    );
  }

  // Double check inputs
  const resolvedXAxis = xAxis || Object.keys(data[0] || {})[0] || '';
  
  // Resolve yAxis: if empty, find first numeric field in the data
  let resolvedYAxis = yAxis;
  if (!resolvedYAxis || resolvedYAxis.length === 0) {
    const firstRow = data[0] || {};
    const numericKeys = Object.keys(firstRow).filter(
      key => key !== resolvedXAxis && typeof firstRow[key] === 'number'
    );
    resolvedYAxis = numericKeys.length > 0 ? [numericKeys[0]] : [Object.keys(firstRow)[1]];
  }

  // Render Single Metric KPI Card
  if (chartType === 'card') {
    const firstRow = data[0] || {};
    const metricKey = resolvedYAxis[0] || Object.keys(firstRow)[0] || '';
    const rawVal = firstRow[metricKey];
    
    let formattedVal = rawVal;
    if (typeof rawVal === 'number') {
      if (metricKey.toLowerCase().includes('amount') || metricKey.toLowerCase().includes('sales') || metricKey.toLowerCase().includes('price')) {
        formattedVal = rawVal.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
      } else {
        formattedVal = rawVal.toLocaleString();
      }
    }

    return (
      <div className="card-visual">
        <div className="card-visual-value">{formattedVal}</div>
        <div className="card-visual-label">{title || metricKey.replace(/_/g, ' ')}</div>
      </div>
    );
  }

  // Render Table Visual
  if (chartType === 'table') {
    const columns = Object.keys(data[0] || {});
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <div className="visual-header">
          <div className="visual-title-group">
            <h3 className="visual-title">{title || 'Data Grid'}</h3>
            <p className="visual-subtitle">{explanation}</p>
          </div>
          <span className="visual-type-badge">Table View</span>
        </div>
        
        <div className="table-wrapper" style={{ maxHeight: '340px' }}>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx}>{col.toUpperCase().replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {columns.map((col, colIdx) => {
                    const val = row[col];
                    return (
                      <td key={colIdx}>
                        {typeof val === 'number' 
                          ? val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) 
                          : val?.toString() || '-'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // For charts, define axes styles
  const axisStyle = {
    stroke: '#64748b',
    fontSize: 11,
    fontFamily: 'Inter, sans-serif'
  };

  const gridStyle = {
    stroke: 'rgba(255, 255, 255, 0.05)',
    strokeDasharray: '3 3'
  };

  // Render Recharts
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', height: '100%' }}>
      <div className="visual-header">
        <div className="visual-title-group">
          <h3 className="visual-title">{title}</h3>
          <p className="visual-subtitle">{explanation}</p>
        </div>
        <span className="visual-type-badge">{chartType}</span>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height={320}>
          {chartType === 'bar' && (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey={resolvedXAxis} {...axisStyle} tickLine={false} dy={8} />
              <YAxis {...axisStyle} tickLine={false} axisLine={false} dx={-8} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {resolvedYAxis.map((yCol, idx) => (
                <Bar 
                  key={yCol} 
                  dataKey={yCol} 
                  name={yCol.replace(/_/g, ' ').toUpperCase()} 
                  fill={COLORS[idx % COLORS.length]} 
                  radius={[4, 4, 0, 0]} 
                />
              ))}
            </BarChart>
          )}

          {chartType === 'line' && (
            <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey={resolvedXAxis} {...axisStyle} tickLine={false} dy={8} />
              <YAxis {...axisStyle} tickLine={false} axisLine={false} dx={-8} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {resolvedYAxis.map((yCol, idx) => (
                <Line 
                  key={yCol} 
                  type="monotone" 
                  dataKey={yCol} 
                  name={yCol.replace(/_/g, ' ').toUpperCase()} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2.5}
                  activeDot={{ r: 6 }} 
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          )}

          {chartType === 'area' && (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                {resolvedYAxis.map((yCol, idx) => (
                  <linearGradient key={yCol} id={`colorUv-${idx}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={COLORS[idx % COLORS.length]} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey={resolvedXAxis} {...axisStyle} tickLine={false} dy={8} />
              <YAxis {...axisStyle} tickLine={false} axisLine={false} dx={-8} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              {resolvedYAxis.map((yCol, idx) => (
                <Area 
                  key={yCol} 
                  type="monotone" 
                  dataKey={yCol} 
                  name={yCol.replace(/_/g, ' ').toUpperCase()} 
                  stroke={COLORS[idx % COLORS.length]} 
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#colorUv-${idx})`} 
                />
              ))}
            </AreaChart>
          )}

          {chartType === 'pie' && (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                labelLine={false}
                outerRadius={95}
                innerRadius={60}
                fill="#8884d8"
                dataKey={resolvedYAxis[0]}
                nameKey={resolvedXAxis}
                paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px', bottom: 0 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
