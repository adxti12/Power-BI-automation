import alasql from 'alasql';
import Papa from 'papaparse';

// Helper to check if a value is numeric and convert it
const toNumber = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(val);
  return isNaN(num) ? val : num;
};

// Loader function to fetch and parse a CSV file
const loadCSV = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${url}`);
  }
  const csvText = await response.text();
  
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Clean types (convert numbers)
        const cleanedData = results.data.map(row => {
          const cleanedRow = {};
          for (const key in row) {
            const trimmedKey = key.trim();
            const val = row[key];
            
            // Auto cast fields that are typically numeric
            if ([
              'price', 'quantity', 'total_amount', 
              'total_sales', 'units_sold', 'transaction_count'
            ].includes(trimmedKey.toLowerCase())) {
              cleanedRow[trimmedKey] = toNumber(val);
            } else {
              cleanedRow[trimmedKey] = val;
            }
          }
          return cleanedRow;
        });
        resolve(cleanedData);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

// Database schema definition for Gemini context
export const getDatabaseSchema = () => {
  return `
TABLE category_performance_summary (
  category STRING, -- Name of the product category (e.g. Electronics, Furniture, Appliances, Stationery, Accessories, Apparel)
  total_sales REAL, -- Total sales value in USD for this category
  units_sold INTEGER, -- Number of units sold in this category
  transaction_count INTEGER -- Total transaction count for this category
);

TABLE clean_sales_data (
  transaction_id STRING, -- Unique transaction ID (e.g. TX100001)
  customer_id STRING, -- Customer identifier (e.g. CUST1010)
  product_name STRING, -- Name of product sold (e.g. Laptop, Desk Chair, Backpack, Smartphone, Toaster, Coffee Maker, Notebook, Pen Set)
  category STRING, -- Category name (e.g. Electronics, Furniture, Appliances, Stationery, Accessories, Apparel)
  price REAL, -- Cost of single unit of the product
  quantity INTEGER, -- Quantity of items purchased in this transaction
  transaction_date TIMESTAMP, -- Date and time of transaction (format: 'YYYY-MM-DD HH:MM:SS')
  total_amount REAL -- Total sale value (price * quantity) in USD
);

TABLE sales_data (
  transaction_id STRING, -- Unique transaction ID
  customer_id STRING, -- Customer identifier
  product_name STRING, -- Name of product
  category STRING, -- Category name
  price REAL, -- Price per unit
  quantity INTEGER, -- Quantity of items purchased
  transaction_date TIMESTAMP -- Date and time of transaction (format: 'YYYY-MM-DD HH:MM:SS')
);
  `.trim();
};

let dbInitialized = false;
let dbInitializationPromise = null;

// Initialize the AlaSQL database with our CSV files
export const initDatabase = () => {
  if (dbInitialized) return Promise.resolve();
  if (dbInitializationPromise) return dbInitializationPromise;

  dbInitializationPromise = (async () => {
    try {
      console.log('Initializing local database with CSV files...');
      
      const [categorySummary, cleanSales, rawSales] = await Promise.all([
        loadCSV('/category_performance_summary.csv'),
        loadCSV('/clean_sales_data.csv'),
        loadCSV('/sales_data.csv')
      ]);

      // Create tables in AlaSQL and insert parsed CSV data
      alasql('CREATE TABLE category_performance_summary');
      alasql.tables.category_performance_summary.data = categorySummary;

      alasql('CREATE TABLE clean_sales_data');
      alasql.tables.clean_sales_data.data = cleanSales;

      alasql('CREATE TABLE sales_data');
      alasql.tables.sales_data.data = rawSales;

      dbInitialized = true;
      console.log('Database initialized successfully with tables:', Object.keys(alasql.tables));
    } catch (error) {
      console.error('Failed to initialize local database:', error);
      dbInitializationPromise = null;
      throw error;
    }
  })();

  return dbInitializationPromise;
};

// Execute a SQL query on the database
export const runQuery = async (sqlString) => {
  await initDatabase();
  try {
    // Basic syntax cleaning for AlaSQL
    let cleanSql = sqlString.trim();
    // Remove ending semicolon if present
    if (cleanSql.endsWith(';')) {
      cleanSql = cleanSql.slice(0, -1);
    }
    
    // AlaSQL runs synchronous query
    const result = alasql(cleanSql);
    return result;
  } catch (error) {
    console.error('SQL Execution Error:', error);
    throw error;
  }
};

// Helper to inspect table sample rows
export const getTableSample = async (tableName, limit = 5) => {
  await initDatabase();
  try {
    return alasql(`SELECT * FROM ${tableName} LIMIT ${limit}`);
  } catch (error) {
    console.error(`Failed to fetch sample for ${tableName}:`, error);
    return [];
  }
};

// Helper to check table size
export const getTableInfo = async () => {
  await initDatabase();
  return {
    category_performance_summary: alasql('SELECT COUNT(*) AS cnt FROM category_performance_summary')[0]?.cnt || 0,
    clean_sales_data: alasql('SELECT COUNT(*) AS cnt FROM clean_sales_data')[0]?.cnt || 0,
    sales_data: alasql('SELECT COUNT(*) AS cnt FROM sales_data')[0]?.cnt || 0,
  };
};
