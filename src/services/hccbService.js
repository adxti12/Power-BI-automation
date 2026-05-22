import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from './geminiService';

// Detailed mock brand sales logs for HCCB (May 1, 2026 - May 10, 2026)
// Used by Gemini to answer complex brand-specific questions
export const HCCB_BRAND_DATA = [
  { Date: "2026-05-01", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 420, Unit_Price: 10.5, Revenue: 4410 },
  { Date: "2026-05-01", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 510, Unit_Price: 11.0, Revenue: 5610 },
  { Date: "2026-05-01", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 380, Unit_Price: 10.0, Revenue: 3800 },
  { Date: "2026-05-01", Brand: "Maaza", Category: "Juices", Cases_Sold: 220, Unit_Price: 12.5, Revenue: 2750 },
  { Date: "2026-05-01", Brand: "Kinley", Category: "Water", Cases_Sold: 400, Unit_Price: 6.0, Revenue: 2400 },

  { Date: "2026-05-02", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 450, Unit_Price: 10.5, Revenue: 4725 },
  { Date: "2026-05-02", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 540, Unit_Price: 11.0, Revenue: 5940 },
  { Date: "2026-05-02", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 410, Unit_Price: 10.0, Revenue: 4100 },
  { Date: "2026-05-02", Brand: "Maaza", Category: "Juices", Cases_Sold: 250, Unit_Price: 12.5, Revenue: 3125 },
  { Date: "2026-05-02", Brand: "Kinley", Category: "Water", Cases_Sold: 450, Unit_Price: 6.0, Revenue: 2700 },

  { Date: "2026-05-03", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 390, Unit_Price: 10.5, Revenue: 4095 },
  { Date: "2026-05-03", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 490, Unit_Price: 11.0, Revenue: 5390 },
  { Date: "2026-05-03", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 360, Unit_Price: 10.0, Revenue: 3600 },
  { Date: "2026-05-03", Brand: "Maaza", Category: "Juices", Cases_Sold: 190, Unit_Price: 12.5, Revenue: 2375 },
  { Date: "2026-05-03", Brand: "Kinley", Category: "Water", Cases_Sold: 380, Unit_Price: 6.0, Revenue: 2280 },

  { Date: "2026-05-04", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 480, Unit_Price: 10.5, Revenue: 5040 },
  { Date: "2026-05-04", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 580, Unit_Price: 11.0, Revenue: 6380 },
  { Date: "2026-05-04", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 430, Unit_Price: 10.0, Revenue: 4300 },
  { Date: "2026-05-04", Brand: "Maaza", Category: "Juices", Cases_Sold: 280, Unit_Price: 12.5, Revenue: 3500 },
  { Date: "2026-05-04", Brand: "Kinley", Category: "Water", Cases_Sold: 510, Unit_Price: 6.0, Revenue: 3060 },

  { Date: "2026-05-05", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 510, Unit_Price: 10.5, Revenue: 5355 },
  { Date: "2026-05-05", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 620, Unit_Price: 11.0, Revenue: 6820 },
  { Date: "2026-05-05", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 460, Unit_Price: 10.0, Revenue: 4600 },
  { Date: "2026-05-05", Brand: "Maaza", Category: "Juices", Cases_Sold: 310, Unit_Price: 12.5, Revenue: 3875 },
  { Date: "2026-05-05", Brand: "Kinley", Category: "Water", Cases_Sold: 530, Unit_Price: 6.0, Revenue: 3180 },

  { Date: "2026-05-06", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 430, Unit_Price: 10.5, Revenue: 4515 },
  { Date: "2026-05-06", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 530, Unit_Price: 11.0, Revenue: 5830 },
  { Date: "2026-05-06", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 390, Unit_Price: 10.0, Revenue: 3900 },
  { Date: "2026-05-06", Brand: "Maaza", Category: "Juices", Cases_Sold: 210, Unit_Price: 12.5, Revenue: 2625 },
  { Date: "2026-05-06", Brand: "Kinley", Category: "Water", Cases_Sold: 410, Unit_Price: 6.0, Revenue: 2460 },

  { Date: "2026-05-07", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 460, Unit_Price: 10.5, Revenue: 4830 },
  { Date: "2026-05-07", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 560, Unit_Price: 11.0, Revenue: 6160 },
  { Date: "2026-05-07", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 420, Unit_Price: 10.0, Revenue: 4200 },
  { Date: "2026-05-07", Brand: "Maaza", Category: "Juices", Cases_Sold: 240, Unit_Price: 12.5, Revenue: 3000 },
  { Date: "2026-05-07", Brand: "Kinley", Category: "Water", Cases_Sold: 470, Unit_Price: 6.0, Revenue: 2820 },

  { Date: "2026-05-08", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 520, Unit_Price: 10.5, Revenue: 5460 },
  { Date: "2026-05-08", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 640, Unit_Price: 11.0, Revenue: 7040 },
  { Date: "2026-05-08", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 480, Unit_Price: 10.0, Revenue: 4800 },
  { Date: "2026-05-08", Brand: "Maaza", Category: "Juices", Cases_Sold: 330, Unit_Price: 12.5, Revenue: 4125 },
  { Date: "2026-05-08", Brand: "Kinley", Category: "Water", Cases_Sold: 560, Unit_Price: 6.0, Revenue: 3360 },

  { Date: "2026-05-09", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 400, Unit_Price: 10.5, Revenue: 4200 },
  { Date: "2026-05-09", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 500, Unit_Price: 11.0, Revenue: 5500 },
  { Date: "2026-05-09", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 370, Unit_Price: 10.0, Revenue: 3700 },
  { Date: "2026-05-09", Brand: "Maaza", Category: "Juices", Cases_Sold: 200, Unit_Price: 12.5, Revenue: 2500 },
  { Date: "2026-05-09", Brand: "Kinley", Category: "Water", Cases_Sold: 390, Unit_Price: 6.0, Revenue: 2340 },

  { Date: "2026-05-10", Brand: "Coca-Cola", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 480, Unit_Price: 10.5, Revenue: 5040 },
  { Date: "2026-05-10", Brand: "Thums Up", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 590, Unit_Price: 11.0, Revenue: 6490 },
  { Date: "2026-05-10", Brand: "Sprite", Category: "Carbonated Soft Drinks (CSD)", Cases_Sold: 440, Unit_Price: 10.0, Revenue: 4400 },
  { Date: "2026-05-10", Brand: "Maaza", Category: "Juices", Cases_Sold: 290, Unit_Price: 12.5, Revenue: 3625 },
  { Date: "2026-05-10", Brand: "Kinley", Category: "Water", Cases_Sold: 520, Unit_Price: 6.0, Revenue: 3120 }
];

// Aggregated mock report, simulating DAX calculations for the dashboard view
// DAX Measures Simulated:
// - Total Sales = SUM(Sales[Revenue])
// - Sales YTD = TOTALYTD(SUM(Sales[Revenue]), 'Calendar'[Date])
// - Avg Daily Sales = AVERAGEX(DATESMTD('Calendar'[Date]), [Total Sales])
// - MoM Sales Growth % = DIVIDE([Total Sales] - [PM Sales], [PM Sales])
export const HCCB_DAILY_REPORT = [
  { Date: "2026-05-01", Total_Sales: 18970, Sales_YTD: 954200, Avg_Daily_Sales: 18970, MoM_Sales_Growth_Pct: 4.12 },
  { Date: "2026-05-02", Total_Sales: 20590, Sales_YTD: 974790, Avg_Daily_Sales: 19780, MoM_Sales_Growth_Pct: 5.35 },
  { Date: "2026-05-03", Total_Sales: 17740, Sales_YTD: 992530, Avg_Daily_Sales: 19100, MoM_Sales_Growth_Pct: 2.11 },
  { Date: "2026-05-04", Total_Sales: 22280, Sales_YTD: 1014810, Avg_Daily_Sales: 19895, MoM_Sales_Growth_Pct: 6.84 },
  { Date: "2026-05-05", Total_Sales: 23830, Sales_YTD: 1038640, Avg_Daily_Sales: 20682, MoM_Sales_Growth_Pct: 8.22 },
  { Date: "2026-05-06", Total_Sales: 19330, Sales_YTD: 1057970, Avg_Daily_Sales: 20457, MoM_Sales_Growth_Pct: 3.49 },
  { Date: "2026-05-07", Total_Sales: 21010, Sales_YTD: 1078980, Avg_Daily_Sales: 20536, MoM_Sales_Growth_Pct: 4.88 },
  { Date: "2026-05-08", Total_Sales: 24825, Sales_YTD: 1103805, Avg_Daily_Sales: 21072, MoM_Sales_Growth_Pct: 9.15 },
  { Date: "2026-05-09", Total_Sales: 18240, Sales_YTD: 1122045, Avg_Daily_Sales: 20757, MoM_Sales_Growth_Pct: 1.80 },
  { Date: "2026-05-10", Total_Sales: 22675, Sales_YTD: 1144720, Avg_Daily_Sales: 20949, MoM_Sales_Growth_Pct: 5.92 }
];

export const getHccbKPIs = () => {
  return {
    ytdRevenue: 1144720,
    avgDailySales: 20949,
    growthRate: 5.92,
    activeDays: 10
  };
};

export const askHccbQuestion = async (userPrompt, customApiKey = '') => {
  const apiKey = customApiKey || getGeminiApiKey();
  
  if (!apiKey) {
    throw new Error('Gemini API Key is not set. Please add it to your configuration.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const contextPrompt = `
You are an executive assistant and business intelligence expert looking at the Hindustan Coca-Cola Beverages (HCCB) Daily Sales Report.
You are tasked with answering the user's question regarding this report based on the raw and aggregated data below.

---
AGGREGATED DAILY REPORT (Calculated with simulated DAX Measures: Total_Sales, Sales_YTD, Avg_Daily_Sales, MoM_Sales_Growth_Pct):
${JSON.stringify(HCCB_DAILY_REPORT, null, 2)}

DETAILED BRAND LOGS (Cases sold, unit prices, and revenue for Coca-Cola, Thums Up, Sprite, Maaza, Kinley):
${JSON.stringify(HCCB_BRAND_DATA, null, 2)}
---

Rules for your response:
1. Provide a professional, detailed, and mathematically accurate response.
2. Structure your response using clear markdown (bullet points, bold text).
3. If they ask about DAX definitions used in the report:
   - "Total_Sales" -> SUM(Sales[Revenue])
   - "Sales_YTD" -> TOTALYTD(SUM(Sales[Revenue]), 'Calendar'[Date])
   - "Avg_Daily_Sales" -> AVERAGEX(DATESMTD('Calendar'[Date]), [Total Sales])
   - "MoM_Sales_Growth_Pct" -> DIVIDE([Total Sales] - [PM Sales], [PM Sales])
4. Return a structured JSON response matching the schema below.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `User Question: "${userPrompt}"`,
      config: {
        systemInstruction: contextPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            answer: { 
              type: 'STRING',
              description: 'The natural language markdown answer analyzing the daily sales report.' 
            },
            highlightedMetrics: { 
              type: 'OBJECT',
              description: 'An object of key-value pairs (metric name and value) representing highlighted metrics or facts extracted from the answer.',
              properties: {
                "Metric 1": { type: "STRING" },
                "Metric 2": { type: "STRING" }
              }
            }
          },
          required: ['answer']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini.");
    return JSON.parse(text);
  } catch (error) {
    console.error("HCCB Gemini API Error:", error);
    throw error;
  }
};
