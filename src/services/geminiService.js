import { GoogleGenAI } from '@google/genai';
import { getDatabaseSchema } from './dbService';

// Fetch API Key from localStorage or environment
export const getGeminiApiKey = () => {
  const localKey = localStorage.getItem('GEMINI_API_KEY');
  if (localKey) return localKey;
  
  // Vite loads environment variables starting with VITE_
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

// Save key to localStorage
export const saveGeminiApiKey = (key) => {
  if (key) {
    localStorage.setItem('GEMINI_API_KEY', key);
  } else {
    localStorage.removeItem('GEMINI_API_KEY');
  }
};

// Request SQL and chart recommendation from Gemini
export const translatePromptToSQL = async (userPrompt, customApiKey = '') => {
  const apiKey = customApiKey || getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('Gemini API Key is not set. Please add it to your .env file or configuration panel.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const dbSchema = getDatabaseSchema();

  const systemInstructions = `
You are a senior data analyst and SQLite expert helper in a Power BI clone application.
Your job is to translate the user's natural language question into a clean, correct SQL query that runs on the client-side using AlaSQL (which supports standard SQLite syntax).
You must also recommend the best visual chart type, and specify the X and Y axes columns corresponding EXACTLY to the query output columns.

Here is the database schema:
${dbSchema}

Rules for SQL generation:
1. Only query tables that exist in the schema: 'category_performance_summary', 'clean_sales_data', or 'sales_data'.
2. Use standard, simple SQLite-compatible SQL syntax.
3. For date grouping/trends (e.g. monthly sales): the transaction_date is text format 'YYYY-MM-DD HH:MM:SS'. You can extract the year-month using SUBSTRING(transaction_date, 1, 7) or date using SUBSTRING(transaction_date, 1, 10). E.g., SELECT SUBSTRING(transaction_date, 1, 7) AS month, SUM(total_amount) AS total_sales FROM clean_sales_data GROUP BY month ORDER BY month.
4. For text searches, use LIKE (e.g. product_name LIKE '%Laptop%').
5. ALWAYS alias aggregate columns (e.g., SUM(total_amount) AS total_sales, COUNT(*) AS txn_count) so they are easy to render and map to chart axes.
6. Only return the SQL query itself inside the JSON. Do not write markdown tags inside the JSON values.

Rules for Chart selection:
- "card": Use this ONLY when the query returns a single aggregate row and a single column (e.g. "What are the total sales?", "What is the average transaction value?"). The JSON yAxis should include the single column name.
- "bar": Use for categorical comparison (e.g., Sales by Category, Top 5 Products by units sold). xAxis is the categorical column, yAxis contains numeric columns.
- "line" or "area": Use for chronological trends (e.g., sales over time, transaction count by day). xAxis is the date/time column, yAxis contains numeric columns.
- "pie": Use for composition/percentage breakdown (e.g., share of sales per category). xAxis is the category, yAxis contains the numeric metric (only 1 metric). Limit categories to top 6-8 max, group others or order desc.
- "table": Use when the result is a list of rows/details (e.g. "Show me all transactions for product Laptop", or "List customer purchases").
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User Question: "${userPrompt}"`,
      config: {
        systemInstruction: systemInstructions,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            sql: { 
              type: 'STRING',
              description: 'The SQLite/AlaSQL compatible SQL query to fetch the requested data.' 
            },
            chartType: { 
              type: 'STRING', 
              enum: ['bar', 'line', 'area', 'pie', 'card', 'table'],
              description: 'The recommended chart type for visual representation.'
            },
            xAxis: { 
              type: 'STRING',
              description: 'The column name from the query result to place on the X-axis (leave empty for "card").'
            },
            yAxis: { 
              type: 'ARRAY', 
              items: { type: 'STRING' },
              description: 'An array of column names from the query result to plot on the Y-axis / values (usually numeric fields).'
            },
            title: { 
              type: 'STRING',
              description: 'A concise and informative title for the visual chart.'
            },
            explanation: { 
              type: 'STRING', 
              description: 'A brief, friendly one-sentence explanation of what data is shown.'
            }
          },
          required: ['sql', 'chartType', 'title', 'explanation']
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini API returned an empty response.');
    }

    const result = JSON.parse(resultText);
    return result;
  } catch (error) {
    console.error('Error generating SQL from Gemini:', error);
    throw error;
  }
};
