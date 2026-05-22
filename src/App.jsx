import React, { useState, useEffect } from 'react';
import { 
  BarChart2, 
  Search, 
  Settings, 
  Database, 
  Terminal, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Layers, 
  Key, 
  AlertTriangle, 
  Play, 
  CheckCircle2, 
  X, 
  RefreshCw,
  HelpCircle,
  Eye,
  FileText,
  MessageSquare,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { initDatabase, runQuery, getTableInfo, getTableSample } from './services/dbService';
import { translatePromptToSQL, getGeminiApiKey, saveGeminiApiKey } from './services/geminiService';
import { ChartVisualizer } from './components/ChartVisualizer';
import { 
  HCCB_DAILY_REPORT, 
  getHccbKPIs, 
  askHccbQuestion 
} from './services/hccbService';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const SUGGESTIONS = [
  "What is the total sales per category?",
  "Show me the daily sales trend in an area chart",
  "Top 5 product names by total transaction count",
  "What are the total sales, units sold, and average price per category?",
  "Show overall total sales as a KPI card"
];

const HCCB_SUGGESTIONS = [
  "Summarize the sales trend for our brands.",
  "Which day had the highest MoM growth and what was the value?",
  "Compare the performance of CSDs vs Juices and Water.",
  "What are the DAX definitions for these measures?",
  "Explain the relationship between daily sales and average daily sales."
];

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [tableCounts, setTableCounts] = useState({});
  const [selectedTable, setSelectedTable] = useState('clean_sales_data');
  const [tableSampleData, setTableSampleData] = useState([]);
  
  // Navigation: 'sql-workspace' or 'hccb-report'
  const [activeWorkspace, setActiveWorkspace] = useState('sql-workspace');

  // SQL Q&A state
  const [promptInput, setPromptInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // SQL Execution result state
  const [queryResult, setQueryResult] = useState(null);
  const [currentSql, setCurrentSql] = useState('');
  const [chartConfig, setChartConfig] = useState({
    chartType: 'table',
    xAxis: '',
    yAxis: [],
    title: 'Data Grid',
    explanation: 'No query executed yet.'
  });

  // Overall CSV KPI values
  const [kpis, setKpis] = useState({
    totalSales: 0,
    avgTxn: 0,
    totalTxns: 0,
    totalUnits: 0
  });

  // HCCB Daily Sales Report state
  const [hccbPromptInput, setHccbPromptInput] = useState('');
  const [hccbLoading, setHccbLoading] = useState(false);
  const [hccbError, setHccbError] = useState(null);
  const [hccbAnswer, setHccbAnswer] = useState('');
  const [hccbMetrics, setHccbMetrics] = useState(null);
  const hccbKPIs = getHccbKPIs();

  // Settings state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  // Tab State for workspace view
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('visual'); // 'visual' or 'preview'

  // Initialize DB and load key
  useEffect(() => {
    const key = getGeminiApiKey();
    setHasApiKey(!!key);
    setApiKeyInput(key);

    const setupApp = async () => {
      try {
        await initDatabase();
        setDbReady(true);
        
        // Fetch table stats
        const info = await getTableInfo();
        setTableCounts(info);
        
        // Fetch initial table sample
        const sample = await getTableSample('clean_sales_data', 15);
        setTableSampleData(sample);

        // Fetch general CSV KPIs
        const totalSalesRes = await runQuery('SELECT SUM(total_amount) AS val FROM clean_sales_data');
        const avgTxnRes = await runQuery('SELECT AVG(total_amount) AS val FROM clean_sales_data');
        const totalTxnsRes = await runQuery('SELECT COUNT(*) AS val FROM clean_sales_data');
        const totalUnitsRes = await runQuery('SELECT SUM(quantity) AS val FROM clean_sales_data');

        setKpis({
          totalSales: totalSalesRes[0]?.val || 0,
          avgTxn: avgTxnRes[0]?.val || 0,
          totalTxns: totalTxnsRes[0]?.val || 0,
          totalUnits: totalUnitsRes[0]?.val || 0
        });

      } catch (err) {
        console.error(err);
        setDbError('Failed to initialize local data files. Please check console.');
      }
    };

    setupApp();
  }, []);

  // Update sample data when sidebar table selection changes
  useEffect(() => {
    if (dbReady) {
      getTableSample(selectedTable, 15).then(sample => {
        setTableSampleData(sample);
      });
    }
  }, [selectedTable, dbReady]);

  // Handle Q&A Prompt Submission
  const handlePromptSubmit = async (e, customPrompt = '') => {
    if (e) e.preventDefault();
    const activePrompt = customPrompt || promptInput;
    if (!activePrompt.trim()) return;

    if (!hasApiKey) {
      setShowSettingsModal(true);
      return;
    }

    setLoading(true);
    setError(null);
    setActiveWorkspaceTab('visual');

    try {
      // Call Gemini translation service
      const translation = await translatePromptToSQL(activePrompt);
      console.log('Gemini SQL Translation:', translation);

      setCurrentSql(translation.sql);
      setChartConfig({
        chartType: translation.chartType,
        xAxis: translation.xAxis || '',
        yAxis: translation.yAxis || [],
        title: translation.title || 'Visual Report',
        explanation: translation.explanation || ''
      });

      // Run generated query
      const data = await runQuery(translation.sql);
      setQueryResult(data);

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate and execute SQL query.');
    } finally {
      setLoading(false);
    }
  };

  // Run Custom Edited SQL
  const handleExecuteSql = async () => {
    if (!currentSql.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await runQuery(currentSql);
      setQueryResult(data);
      
      if (!data || data.length === 0) {
        setChartConfig(prev => ({
          ...prev,
          explanation: 'SQL executed successfully but returned 0 rows.'
        }));
      }
    } catch (err) {
      console.error(err);
      setError(`SQL Execution Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle HCCB Daily Report Q&A Submission
  const handleHccbPromptSubmit = async (e, customPrompt = '') => {
    if (e) e.preventDefault();
    const activePrompt = customPrompt || hccbPromptInput;
    if (!activePrompt.trim()) return;

    if (!hasApiKey) {
      setShowSettingsModal(true);
      return;
    }

    setHccbLoading(true);
    setHccbError(null);
    setHccbAnswer('');
    setHccbMetrics(null);

    try {
      const result = await askHccbQuestion(activePrompt);
      setHccbAnswer(result.answer);
      if (result.highlightedMetrics) {
        setHccbMetrics(result.highlightedMetrics);
      }
    } catch (err) {
      console.error(err);
      setHccbError(err.message || 'Failed to analyze the HCCB sales report.');
    } finally {
      setHccbLoading(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    saveGeminiApiKey(apiKeyInput);
    setHasApiKey(!!apiKeyInput);
    setShowSettingsModal(false);
  };

  // Handle Chart Type manual change
  const handleChartTypeChange = (newType) => {
    setChartConfig(prev => ({
      ...prev,
      chartType: newType
    }));
  };

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <BarChart2 className="logo-icon" size={24} />
          <span className="logo-text">Power BI Automation</span>
        </div>

        <div className="sidebar-content">
          {/* Main Navigation Modules */}
          <div className="sidebar-section">
            <span className="sidebar-section-title">Workspace Views</span>
            <button 
              className={`sidebar-item ${activeWorkspace === 'sql-workspace' ? 'active' : ''}`}
              onClick={() => setActiveWorkspace('sql-workspace')}
            >
              <Terminal size={16} />
              <span>CSV SQL Insights</span>
            </button>
            <button 
              className={`sidebar-item ${activeWorkspace === 'hccb-report' ? 'active' : ''}`}
              onClick={() => setActiveWorkspace('hccb-report')}
            >
              <FileText size={16} />
              <span>HCCB Daily Report</span>
            </button>
          </div>

          {activeWorkspace === 'sql-workspace' ? (
            <div className="sidebar-section">
              <span className="sidebar-section-title">Datasets (CSVs Loaded)</span>
              
              <button 
                className={`sidebar-item ${selectedTable === 'clean_sales_data' ? 'active' : ''}`}
                onClick={() => setSelectedTable('clean_sales_data')}
              >
                <Database size={16} />
                <div style={{ flex: 1 }}>
                  <div>clean_sales_data</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>
                    {tableCounts.clean_sales_data || 0} rows • Transactions
                  </div>
                </div>
              </button>

              <button 
                className={`sidebar-item ${selectedTable === 'category_performance_summary' ? 'active' : ''}`}
                onClick={() => setSelectedTable('category_performance_summary')}
              >
                <Database size={16} />
                <div style={{ flex: 1 }}>
                  <div>category_performance</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>
                    {tableCounts.category_performance_summary || 0} rows • Aggregated
                  </div>
                </div>
              </button>

              <button 
                className={`sidebar-item ${selectedTable === 'sales_data' ? 'active' : ''}`}
                onClick={() => setSelectedTable('sales_data')}
              >
                <Database size={16} />
                <div style={{ flex: 1 }}>
                  <div>sales_data (raw)</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>
                    {tableCounts.sales_data || 0} rows • Raw
                  </div>
                </div>
              </button>

              <span className="sidebar-section-title" style={{ marginTop: '16px' }}>Schema Reference ({selectedTable})</span>
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px', 
                padding: '12px', 
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '180px',
                overflowY: 'auto'
              }}>
                {selectedTable === 'clean_sales_data' && (
                  <>
                    <div><strong>transaction_id</strong>: TEXT (TX100...)</div>
                    <div><strong>customer_id</strong>: TEXT (CUST1...)</div>
                    <div><strong>product_name</strong>: TEXT (Laptop, Toaster)</div>
                    <div><strong>category</strong>: TEXT (Electronics)</div>
                    <div><strong>price</strong>: REAL</div>
                    <div><strong>quantity</strong>: INTEGER</div>
                    <div><strong>transaction_date</strong>: TIMESTAMP</div>
                    <div><strong>total_amount</strong>: REAL (price*qty)</div>
                  </>
                )}
                {selectedTable === 'category_performance_summary' && (
                  <>
                    <div><strong>category</strong>: TEXT</div>
                    <div><strong>total_sales</strong>: REAL</div>
                    <div><strong>units_sold</strong>: INTEGER</div>
                    <div><strong>transaction_count</strong>: INTEGER</div>
                  </>
                )}
                {selectedTable === 'sales_data' && (
                  <>
                    <div><strong>transaction_id</strong>: TEXT</div>
                    <div><strong>customer_id</strong>: TEXT</div>
                    <div><strong>product_name</strong>: TEXT</div>
                    <div><strong>category</strong>: TEXT</div>
                    <div><strong>price</strong>: REAL</div>
                    <div><strong>quantity</strong>: INTEGER</div>
                    <div><strong>transaction_date</strong>: TIMESTAMP</div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="sidebar-section">
              <span className="sidebar-section-title">HCCB Sales Measures</span>
              <div style={{ 
                background: 'rgba(0,0,0,0.2)', 
                borderRadius: '8px', 
                padding: '12px', 
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div><strong>[Total Sales]</strong>: <code style={{color: 'var(--accent-cyan)'}}>SUM(Sales[Revenue])</code></div>
                <div><strong>[Sales YTD]</strong>: <code style={{color: 'var(--accent-cyan)'}}>TOTALYTD([Total Sales], 'Calendar'[Date])</code></div>
                <div><strong>[Avg Daily Sales]</strong>: <code style={{color: 'var(--accent-cyan)'}}>AVERAGEX(DATESMTD('Calendar'[Date]), [Total Sales])</code></div>
                <div><strong>[MoM Growth %]</strong>: <code style={{color: 'var(--accent-cyan)'}}>DIVIDE([Total Sales]-[PM Sales], [PM Sales])</code></div>
              </div>
            </div>
          )}
        </div>

        <div className="sidebar-footer">
          <button className="settings-trigger" onClick={() => setShowSettingsModal(true)}>
            <Settings size={16} />
            Configure Gemini Key
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {/* Top Header */}
        <header className="top-bar">
          <div className="top-bar-title">
            {activeWorkspace === 'sql-workspace' ? 'CSV Insights Workspace' : 'HCCB Corporate Dashboard'}
          </div>
          <div className="top-bar-actions">
            {hasApiKey ? (
              <div className="api-badge connected">
                <CheckCircle2 size={12} />
                <span>Gemini API Connected</span>
              </div>
            ) : (
              <div className="api-badge missing" onClick={() => setShowSettingsModal(true)}>
                <AlertTriangle size={12} />
                <span>API Key Missing (Click to setup)</span>
              </div>
            )}
          </div>
        </header>

        {/* Workspace Display */}
        {activeWorkspace === 'sql-workspace' ? (
          /* CSV SQL Q&A Workspace */
          <div className="workspace-container">
            {dbError && (
              <div className="error-banner">
                <AlertTriangle size={16} />
                <span>{dbError}</span>
              </div>
            )}

            {/* Q&A prompt search row */}
            <section className="qa-card">
              <div className="qa-title">
                <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
                <span>Ask CSV Insights Q&A</span>
              </div>
              
              <form className="qa-form" onSubmit={(e) => handlePromptSubmit(e)}>
                <div className="qa-input-wrapper">
                  <Search className="qa-input-icon" size={18} />
                  <input 
                    type="text" 
                    className="qa-input" 
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="e.g. What are the total sales per category? or Show monthly transaction count..."
                    disabled={!dbReady || loading}
                  />
                </div>
                <button 
                  type="submit" 
                  className="qa-button"
                  disabled={!dbReady || loading || !promptInput.trim()}
                >
                  {loading ? <RefreshCw className="spinner" style={{ width: 16, height: 16, borderLeftColor: '#fff', borderTopColor: '#fff', borderRightColor: '#fff', margin: 0 }} /> : <Play size={16} />}
                  <span>{loading ? 'Analyzing...' : 'Ask AI'}</span>
                </button>
              </form>

              <div className="suggestions-grid">
                {SUGGESTIONS.map((sug, idx) => (
                  <button 
                    key={idx}
                    type="button" 
                    className="suggestion-pill"
                    onClick={() => {
                      setPromptInput(sug);
                      handlePromptSubmit(null, sug);
                    }}
                    disabled={!dbReady || loading}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </section>

            {/* KPI Metrics Dashboard Panel */}
            <section className="summary-grid">
              <div className="summary-card">
                <div className="summary-card-header">
                  <span>TOTAL REVENUE</span>
                  <DollarSign className="summary-card-icon" size={16} />
                </div>
                <div className="summary-card-value">
                  ${kpis.totalSales.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--accent-green)' }}>
                  Based on clean sales data
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-header">
                  <span>TOTAL TRANSACTIONS</span>
                  <ShoppingBag className="summary-card-icon" size={16} />
                </div>
                <div className="summary-card-value">
                  {kpis.totalTxns.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Unique transaction IDs
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-header">
                  <span>UNITS SOLD</span>
                  <Layers className="summary-card-icon" size={16} />
                </div>
                <div className="summary-card-value">
                  {kpis.totalUnits.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Sum of transaction quantities
                </div>
              </div>

              <div className="summary-card">
                <div className="summary-card-header">
                  <span>AVG TRANSACTION VALUE</span>
                  <TrendingUp className="summary-card-icon" size={16} />
                </div>
                <div className="summary-card-value">
                  ${kpis.avgTxn.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--accent-cyan)' }}>
                  Overall average ticket size
                </div>
              </div>
            </section>

            {/* Workspace Report and SQL Console Grid */}
            <section className="dashboard-grid">
              
              {/* Visual Output Card */}
              <div className="visual-card">
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', gap: '20px' }}>
                  <button 
                    className={`sidebar-item ${activeWorkspaceTab === 'visual' ? 'active' : ''}`}
                    onClick={() => setActiveWorkspaceTab('visual')}
                    style={{ width: 'auto', padding: '6px 12px', borderLeft: 'none', borderBottom: activeWorkspaceTab === 'visual' ? '2px solid var(--primary)' : 'none', borderRadius: '4px 4px 0 0' }}
                  >
                    <BarChart2 size={16} /> Visual Report
                  </button>
                  <button 
                    className={`sidebar-item ${activeWorkspaceTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setActiveWorkspaceTab('preview')}
                    style={{ width: 'auto', padding: '6px 12px', borderLeft: 'none', borderBottom: activeWorkspaceTab === 'preview' ? '2px solid var(--primary)' : 'none', borderRadius: '4px 4px 0 0' }}
                  >
                    <Eye size={16} /> Dataset Viewer ({selectedTable})
                  </button>
                </div>

                {activeWorkspaceTab === 'visual' ? (
                  <ChartVisualizer 
                    chartType={chartConfig.chartType}
                    data={queryResult}
                    xAxis={chartConfig.xAxis}
                    yAxis={chartConfig.yAxis}
                    title={chartConfig.title}
                    explanation={chartConfig.explanation}
                  />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="visual-header">
                      <div className="visual-title-group">
                        <h3 className="visual-title">15 Row Sample: {selectedTable}</h3>
                        <p className="visual-subtitle">Direct file view of parsed database columns.</p>
                      </div>
                    </div>
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {tableSampleData[0] && Object.keys(tableSampleData[0]).map((col, idx) => (
                              <th key={idx}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableSampleData.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {Object.keys(row).map((col, colIdx) => (
                                <td key={colIdx}>
                                  {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]?.toString() || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* SQL Terminal Console Card */}
              <div className="visual-card console-card">
                <div className="console-header">
                  <div className="console-title">
                    <Terminal size={16} style={{ color: 'var(--accent-cyan)' }} />
                    <span>SQL Query Console</span>
                  </div>
                  {queryResult && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {queryResult.length} rows returned
                    </span>
                  )}
                </div>

                <div className="editor-wrapper">
                  <textarea 
                    className="sql-editor" 
                    value={currentSql}
                    onChange={(e) => setCurrentSql(e.target.value)}
                    placeholder="SELECT * FROM clean_sales_data LIMIT 10"
                    disabled={!dbReady}
                  />
                </div>

                <div className="console-actions">
                  {queryResult && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="form-label" style={{ margin: 0 }}>Visual:</span>
                      <select 
                        value={chartConfig.chartType}
                        onChange={(e) => handleChartTypeChange(e.target.value)}
                        style={{ 
                          background: 'rgba(15, 23, 42, 0.8)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: '6px', 
                          color: 'var(--text-main)',
                          padding: '4px 8px',
                          fontSize: '0.8rem',
                          outline: 'none'
                        }}
                      >
                        <option value="table">Table</option>
                        <option value="card">KPI Card</option>
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="area">Area Chart</option>
                        <option value="pie">Pie Chart</option>
                      </select>
                    </div>
                  )}
                  
                  <button 
                    className="btn-accent" 
                    onClick={handleExecuteSql}
                    disabled={loading || !currentSql.trim()}
                    style={{ marginLeft: 'auto' }}
                  >
                    <Play size={12} />
                    <span>Run SQL</span>
                  </button>
                </div>

                {error && (
                  <div className="error-banner" style={{ margin: 0, padding: '10px 12px' }}>
                    <AlertTriangle size={14} />
                    <span style={{ fontSize: '0.75rem' }}>{error}</span>
                  </div>
                )}

                {chartConfig.explanation && queryResult && (
                  <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '12px', 
                    fontSize: '0.8rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px'
                  }}>
                    <HelpCircle size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
                    <span>{chartConfig.explanation}</span>
                  </div>
                )}
              </div>

            </section>

            {/* Raw SQL Data Result Table at Bottom */}
            {queryResult && queryResult.length > 0 && chartConfig.chartType !== 'table' && (
              <section className="table-card">
                <div className="visual-header" style={{ marginBottom: '14px' }}>
                  <div className="visual-title-group">
                    <h3 className="visual-title" style={{ fontSize: '1rem' }}>Query Result Dataset ({queryResult.length} rows)</h3>
                  </div>
                </div>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {Object.keys(queryResult[0] || {}).map((col, idx) => (
                          <th key={idx}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {Object.keys(row).map((col, colIdx) => {
                            const val = row[col];
                            return (
                              <td key={colIdx}>
                                {typeof val === 'number' ? val.toLocaleString() : val?.toString() || '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

          </div>
        ) : (
          /* HCCB Daily DAX Report Workspace */
          <div className="workspace-container">
            {/* HCCB KPI Measure Cards */}
            <section className="summary-grid">
              <div className="summary-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div className="summary-card-header">
                  <span>HCCB YTD SALES [Sales YTD]</span>
                  <DollarSign className="summary-card-icon" size={16} />
                </div>
                <div className="summary-card-value">
                  ${hccbKPIs.ytdRevenue.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  TOTALYTD Calculation
                </div>
              </div>

              <div className="summary-card" style={{ borderLeft: '4px solid var(--accent-cyan)' }}>
                <div className="summary-card-header">
                  <span>AVG DAILY SALES [Avg Daily Sales]</span>
                  <TrendingUp className="summary-card-icon" size={16} />
                </div>
                <div className="summary-card-value">
                  ${hccbKPIs.avgDailySales.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  AVERAGEX over DATESMTD
                </div>
              </div>

              <div className="summary-card" style={{ borderLeft: '4px solid var(--accent-green)' }}>
                <div className="summary-card-header">
                  <span>MOM GROWTH RATE [MoM Growth %]</span>
                  <Layers className="summary-card-icon" size={16} />
                </div>
                <div className="summary-card-value">
                  +{hccbKPIs.growthRate}%
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--accent-green)' }}>
                  DIVIDE against Previous Month
                </div>
              </div>

              <div className="summary-card" style={{ borderLeft: '4px solid var(--text-dark)' }}>
                <div className="summary-card-header">
                  <span>REPORTING ACTIVE DAYS</span>
                  <CheckCircle2 className="summary-card-icon" size={16} style={{ color: 'var(--accent-green)' }} />
                </div>
                <div className="summary-card-value">
                  {hccbKPIs.activeDays} Days
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                  Active logging count
                </div>
              </div>
            </section>

            {/* Split layout: Chart vs Q&A */}
            <section className="dashboard-grid">
              
              {/* Daily Composed Trend Chart */}
              <div className="visual-card">
                <div className="visual-header">
                  <div className="visual-title-group">
                    <h3 className="visual-title">Daily Sales vs. Average Daily Sales</h3>
                    <p className="visual-subtitle">Visualizing simulated DAX measures side-by-side</p>
                  </div>
                  <span className="visual-type-badge">Composed Visual</span>
                </div>

                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={HCCB_DAILY_REPORT} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="Date" stroke="#64748b" fontSize={11} tickLine={false} dy={8} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-8} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                        cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      
                      {/* Bar showing daily sales */}
                      <Bar name="TOTAL DAILY SALES" dataKey="Total_Sales" fill="rgba(139, 92, 246, 0.6)" radius={[4, 4, 0, 0]} />
                      
                      {/* Line showing running average */}
                      <Line name="AVG DAILY SALES (DAX)" type="monotone" dataKey="Avg_Daily_Sales" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversational Report Q&A */}
              <div className="visual-card" style={{ minHeight: '412px', display: 'flex', flexDirection: 'column' }}>
                <div className="visual-header" style={{ paddingBottom: '12px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                  <div className="visual-title-group">
                    <h3 className="visual-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={18} style={{ color: 'var(--primary)' }} />
                      <span>HCCB Executive Assistant</span>
                    </h3>
                    <p className="visual-subtitle">Ask questions about daily records, brands, or DAX measures</p>
                  </div>
                </div>

                {/* Q&A Form */}
                <form className="qa-form" onSubmit={(e) => handleHccbPromptSubmit(e)} style={{ marginBottom: '14px' }}>
                  <div className="qa-input-wrapper">
                    <MessageSquare className="qa-input-icon" size={18} />
                    <input 
                      type="text" 
                      className="qa-input" 
                      value={hccbPromptInput}
                      onChange={(e) => setHccbPromptInput(e.target.value)}
                      placeholder="e.g. Which brand sold the most? or Summarize growth..."
                      disabled={hccbLoading}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="qa-button"
                    disabled={hccbLoading || !hccbPromptInput.trim()}
                  >
                    {hccbLoading ? <RefreshCw className="spinner" style={{ width: 16, height: 16, borderLeftColor: '#fff', borderTopColor: '#fff', borderRightColor: '#fff', margin: 0 }} /> : <Play size={16} />}
                    <span>{hccbLoading ? 'Thinking...' : 'Ask'}</span>
                  </button>
                </form>

                {/* Suggestion pills */}
                {!hccbAnswer && !hccbLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                    <span className="form-label" style={{ fontSize: '0.725rem' }}>SUGGESTED QUESTIONS:</span>
                    {HCCB_SUGGESTIONS.map((sug, idx) => (
                      <button 
                        key={idx}
                        className="suggestion-pill"
                        style={{ padding: '8px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => {
                          setHccbPromptInput(sug);
                          handleHccbPromptSubmit(null, sug);
                        }}
                      >
                        <ChevronRight size={12} style={{ color: 'var(--primary)' }} />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Loading state visual */}
                {hccbLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                    <RefreshCw className="spinner" size={28} />
                    <span style={{ fontSize: '0.8rem', marginTop: '10px' }}>Analyzing HCCB daily report tables...</span>
                  </div>
                )}

                {/* Error Box */}
                {hccbError && (
                  <div className="error-banner" style={{ margin: 0, padding: '10px 12px' }}>
                    <AlertTriangle size={14} />
                    <span style={{ fontSize: '0.75rem' }}>{hccbError}</span>
                  </div>
                )}

                {/* Q&A Output */}
                {hccbAnswer && !hccbLoading && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', maxHeight: '300px', paddingRight: '4px' }}>
                    
                    {/* Render Highlighted Metrics if any */}
                    {hccbMetrics && Object.keys(hccbMetrics).length > 0 && (
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {Object.entries(hccbMetrics).map(([key, val]) => (
                          <div key={key} style={{ 
                            background: 'rgba(139, 92, 246, 0.08)', 
                            border: '1px solid rgba(139, 92, 246, 0.2)', 
                            borderRadius: '8px', 
                            padding: '6px 12px', 
                            fontSize: '0.75rem'
                          }}>
                            <span style={{ color: 'var(--text-muted)' }}>{key}: </span>
                            <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{val}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ 
                      fontSize: '0.85rem', 
                      lineHeight: 1.6, 
                      color: 'var(--text-main)',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '16px',
                      whiteSpace: 'pre-line'
                    }}>
                      {hccbAnswer}
                    </div>

                    <button 
                      className="btn-secondary" 
                      onClick={() => { setHccbAnswer(''); setHccbMetrics(null); setHccbPromptInput(''); }}
                      style={{ alignSelf: 'flex-end', fontSize: '0.75rem', padding: '6px 12px' }}
                    >
                      Clear Answer
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Daily Report Data Grid */}
            <section className="table-card">
              <div className="visual-header" style={{ marginBottom: '14px' }}>
                <div className="visual-title-group">
                  <h3 className="visual-title" style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={16} style={{ color: 'var(--primary)' }} />
                    <span>Daily Sales Log (Calculated Columns)</span>
                  </h3>
                  <p className="visual-subtitle">Tabular representation of core DAX metrics across 10 reporting days.</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Total Sales [Total Sales]</th>
                      <th>Sales YTD [Sales YTD]</th>
                      <th>Avg Daily Sales [Avg Daily Sales]</th>
                      <th>MoM Growth Rate [MoM Growth %]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HCCB_DAILY_REPORT.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.Date}</td>
                        <td>${row.Total_Sales.toLocaleString()}</td>
                        <td>${row.Sales_YTD.toLocaleString()}</td>
                        <td>${row.Avg_Daily_Sales.toLocaleString()}</td>
                        <td style={{ color: row.MoM_Sales_Growth_Pct >= 5 ? 'var(--accent-green)' : 'var(--accent-cyan)' }}>
                          +{row.MoM_Sales_Growth_Pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Settings Modal (API Key Configuration) */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} style={{ color: 'var(--primary)' }} />
                <span>Configure Gemini API Key</span>
              </div>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Gemini API Key</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="AIzaSy..." 
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <span className="form-help">
                  This key will be saved locally in your browser's <code>localStorage</code>. It is never sent to any server other than directly to Google's Gemini API endpoints.
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSettingsModal(false)}>
                Cancel
              </button>
              <button className="btn-accent" onClick={handleSaveSettings} style={{ background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }}>
                Save Connection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
