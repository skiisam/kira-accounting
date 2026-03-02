/**
 * Bank Statement Parser Utility
 * Parses CSV, OFX and other bank statement formats from Malaysian banks
 */

import { Decimal } from '@prisma/client/runtime/library';

export interface ParsedTransaction {
  transactionDate: Date;
  valueDate?: Date;
  description: string;
  reference?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  rawData?: Record<string, any>;
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
  warnings: string[];
  bankCode?: string;
  accountNumber?: string;
  statementPeriod?: {
    from: Date;
    to: Date;
  };
}

// Malaysian bank CSV column mappings
const BANK_COLUMN_MAPPINGS: Record<string, Record<string, string>> = {
  maybank: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference',
    debit: 'Withdrawal',
    credit: 'Deposit',
    balance: 'Balance',
  },
  maybank_alt: {
    date: 'Date',
    valueDate: 'Value Date',
    description: 'Particulars',
    reference: 'Cheque No',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  cimb: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference No',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  cimb_alt: {
    date: 'Date',
    valueDate: 'Effective Date',
    description: 'Transaction Description',
    reference: 'Reference',
    debit: 'Withdrawal (DR)',
    credit: 'Deposit (CR)',
    balance: 'Ledger Balance',
  },
  publicbank: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference',
    debit: 'Debit Amount',
    credit: 'Credit Amount',
    balance: 'Balance',
  },
  rhb: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference Number',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  hongleong: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Cheque/Reference No',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  ambank: {
    date: 'Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  uob: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Running Balance',
  },
  ocbc: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference',
    debit: 'Withdrawal',
    credit: 'Deposit',
    balance: 'Balance',
  },
  hsbc: {
    date: 'Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  standardchartered: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Narrative',
    reference: 'Reference',
    debit: 'Debit Amount',
    credit: 'Credit Amount',
    balance: 'Running Balance',
  },
  bankislam: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference No',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  bankrakyat: {
    date: 'Tarikh',
    valueDate: 'Tarikh Nilai',
    description: 'Keterangan',
    reference: 'No Rujukan',
    debit: 'Debit',
    credit: 'Kredit',
    balance: 'Baki',
  },
  affinbank: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
  alliancebank: {
    date: 'Transaction Date',
    valueDate: 'Value Date',
    description: 'Description',
    reference: 'Reference Number',
    debit: 'Debit',
    credit: 'Credit',
    balance: 'Balance',
  },
};

// Common date patterns
const DATE_PATTERNS = [
  /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
  /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  /^(\d{4})\/(\d{2})\/(\d{2})$/, // YYYY/MM/DD
  /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
  /^(\d{2})\.(\d{2})\.(\d{4})$/, // DD.MM.YYYY
  /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/, // D MMM YYYY
  /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/, // D-MMM-YYYY
  /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/, // D/MMM/YYYY
];

const MONTH_MAP: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse a date string using common formats
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  const trimmed = dateStr.trim();
  
  // Try standard Date parsing first
  const standard = new Date(trimmed);
  if (!isNaN(standard.getTime()) && trimmed.includes('-') && trimmed.length >= 10) {
    return standard;
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
  let match = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // YYYY/MM/DD or YYYY-MM-DD
  match = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // D MMM YYYY or D-MMM-YYYY
  match = trimmed.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3})[\s\-\/](\d{4})$/);
  if (match) {
    const [, day, monthStr, year] = match;
    const month = MONTH_MAP[monthStr.toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(year), month, parseInt(day));
    }
  }
  
  return null;
}

/**
 * Parse a monetary value, handling various formats
 */
function parseAmount(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  
  if (typeof value === 'number') return value;
  
  // Remove currency symbols, commas, spaces
  let cleaned = value.toString()
    .replace(/[RM$€£¥]/gi, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();
  
  // Handle brackets for negative numbers (accounting style)
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    cleaned = '-' + cleaned.slice(1, -1);
  }
  
  // Handle DR/CR suffix
  const isDR = cleaned.toUpperCase().endsWith('DR');
  const isCR = cleaned.toUpperCase().endsWith('CR');
  if (isDR || isCR) {
    cleaned = cleaned.slice(0, -2).trim();
  }
  
  const num = parseFloat(cleaned);
  if (isNaN(num)) return undefined;
  
  return Math.abs(num);
}

/**
 * Parse CSV content into rows
 */
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }
  
  // Detect delimiter (comma, semicolon, tab)
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.split(';').length > firstLine.split(',').length) {
    delimiter = ';';
  } else if (firstLine.split('\t').length > firstLine.split(',').length) {
    delimiter = '\t';
  }
  
  // Parse header row
  const headers = parseCSVLine(firstLine, delimiter);
  
  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length === 0 || values.every(v => !v.trim())) continue;
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }
  
  return { headers, rows };
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Detect the bank from column headers
 */
function detectBankFromHeaders(headers: string[]): string | null {
  const headerSet = new Set(headers.map(h => h.toLowerCase().trim()));
  
  for (const [bankCode, mapping] of Object.entries(BANK_COLUMN_MAPPINGS)) {
    const mappingKeys = Object.values(mapping).map(v => v.toLowerCase());
    const matchCount = mappingKeys.filter(key => 
      headers.some(h => h.toLowerCase().trim() === key.toLowerCase())
    ).length;
    
    // If we match at least date and description, consider it a match
    if (matchCount >= 3) {
      return bankCode.replace('_alt', '');
    }
  }
  
  return null;
}

/**
 * Find the best matching column for a field
 */
function findColumn(headers: string[], possibleNames: string[]): string | null {
  for (const name of possibleNames) {
    const found = headers.find(h => h.toLowerCase().trim() === name.toLowerCase());
    if (found) return found;
  }
  return null;
}

/**
 * Auto-detect column mappings from headers
 */
function autoDetectColumns(headers: string[]): Record<string, string> | null {
  const dateCol = findColumn(headers, [
    'Transaction Date', 'Date', 'Trans Date', 'Tarikh', 'Posting Date',
    'Txn Date', 'TransactionDate', 'TxnDate'
  ]);
  
  const descCol = findColumn(headers, [
    'Description', 'Particulars', 'Details', 'Narrative', 'Keterangan',
    'Transaction Description', 'Trans Description', 'Desc'
  ]);
  
  if (!dateCol || !descCol) return null;
  
  const valueDateCol = findColumn(headers, [
    'Value Date', 'Effective Date', 'Tarikh Nilai', 'Val Date'
  ]);
  
  const referenceCol = findColumn(headers, [
    'Reference', 'Ref', 'Reference No', 'Reference Number', 'Cheque No',
    'Cheque/Reference No', 'No Rujukan', 'Check No', 'Trans Ref'
  ]);
  
  const debitCol = findColumn(headers, [
    'Debit', 'Withdrawal', 'Debit Amount', 'DR', 'Withdrawal (DR)',
    'Amount (Dr)', 'Pengeluaran'
  ]);
  
  const creditCol = findColumn(headers, [
    'Credit', 'Deposit', 'Credit Amount', 'CR', 'Deposit (CR)',
    'Amount (Cr)', 'Kemasukan', 'Kredit'
  ]);
  
  const balanceCol = findColumn(headers, [
    'Balance', 'Running Balance', 'Ledger Balance', 'Baki', 'Account Balance',
    'Closing Balance', 'Available Balance'
  ]);
  
  // Check for single amount column with DR/CR indicator
  const amountCol = findColumn(headers, [
    'Amount', 'Transaction Amount', 'Trans Amount', 'Jumlah'
  ]);
  
  return {
    date: dateCol,
    valueDate: valueDateCol || '',
    description: descCol,
    reference: referenceCol || '',
    debit: debitCol || amountCol || '',
    credit: creditCol || '',
    balance: balanceCol || '',
  };
}

/**
 * Parse Maybank CSV format
 */
export function parseMaybankCSV(content: string): ParseResult {
  return parseGenericCSV(content, 'maybank');
}

/**
 * Parse CIMB CSV format
 */
export function parseCIMBCSV(content: string): ParseResult {
  return parseGenericCSV(content, 'cimb');
}

/**
 * Parse generic CSV with auto-detection
 */
export function parseGenericCSV(content: string, preferredBank?: string): ParseResult {
  const result: ParseResult = {
    success: false,
    transactions: [],
    errors: [],
    warnings: [],
  };
  
  try {
    const { headers, rows } = parseCSV(content);
    
    if (headers.length === 0) {
      result.errors.push('No headers found in CSV file');
      return result;
    }
    
    if (rows.length === 0) {
      result.errors.push('No data rows found in CSV file');
      return result;
    }
    
    // Detect or use preferred bank
    let bankCode = preferredBank;
    let columnMapping: Record<string, string> | null = null;
    
    if (bankCode && BANK_COLUMN_MAPPINGS[bankCode]) {
      columnMapping = BANK_COLUMN_MAPPINGS[bankCode];
    } else if (bankCode && BANK_COLUMN_MAPPINGS[bankCode + '_alt']) {
      // Try alternate mapping
      const altMapping = BANK_COLUMN_MAPPINGS[bankCode + '_alt'];
      if (Object.values(altMapping).some(col => headers.includes(col))) {
        columnMapping = altMapping;
      }
    }
    
    if (!columnMapping) {
      // Try to detect from headers
      const detectedBank = detectBankFromHeaders(headers);
      if (detectedBank) {
        bankCode = detectedBank;
        columnMapping = BANK_COLUMN_MAPPINGS[detectedBank] || BANK_COLUMN_MAPPINGS[detectedBank + '_alt'];
        result.bankCode = detectedBank;
      }
    }
    
    // If still no mapping, auto-detect columns
    if (!columnMapping) {
      columnMapping = autoDetectColumns(headers);
      if (!columnMapping) {
        result.errors.push('Could not detect column mappings. Please ensure the CSV has Date and Description columns.');
        return result;
      }
      result.warnings.push('Using auto-detected column mappings');
    }
    
    // Parse transactions
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const dateStr = row[columnMapping.date];
        const date = parseDate(dateStr);
        
        if (!date) {
          result.warnings.push(`Row ${i + 2}: Invalid date "${dateStr}"`);
          continue;
        }
        
        const description = row[columnMapping.description]?.trim();
        if (!description) {
          result.warnings.push(`Row ${i + 2}: Empty description`);
          continue;
        }
        
        const transaction: ParsedTransaction = {
          transactionDate: date,
          description,
          rawData: { ...row },
        };
        
        // Value date
        if (columnMapping.valueDate && row[columnMapping.valueDate]) {
          transaction.valueDate = parseDate(row[columnMapping.valueDate]) || undefined;
        }
        
        // Reference
        if (columnMapping.reference && row[columnMapping.reference]) {
          transaction.reference = row[columnMapping.reference].trim();
        }
        
        // Debit/Credit
        const debit = parseAmount(row[columnMapping.debit]);
        const credit = parseAmount(row[columnMapping.credit]);
        
        if (debit !== undefined && debit > 0) {
          transaction.debit = debit;
        }
        if (credit !== undefined && credit > 0) {
          transaction.credit = credit;
        }
        
        // Balance
        if (columnMapping.balance && row[columnMapping.balance]) {
          transaction.balance = parseAmount(row[columnMapping.balance]);
        }
        
        // Skip if no amount
        if (transaction.debit === undefined && transaction.credit === undefined) {
          result.warnings.push(`Row ${i + 2}: No debit or credit amount`);
          continue;
        }
        
        result.transactions.push(transaction);
      } catch (err) {
        result.warnings.push(`Row ${i + 2}: Parse error - ${(err as Error).message}`);
      }
    }
    
    result.success = result.transactions.length > 0;
    
    if (result.transactions.length > 0) {
      // Determine statement period
      const dates = result.transactions.map(t => t.transactionDate).sort((a, b) => a.getTime() - b.getTime());
      result.statementPeriod = {
        from: dates[0],
        to: dates[dates.length - 1],
      };
    }
    
  } catch (err) {
    result.errors.push(`Parse error: ${(err as Error).message}`);
  }
  
  return result;
}

/**
 * Parse OFX (Open Financial Exchange) format
 */
export function parseOFX(content: string): ParseResult {
  const result: ParseResult = {
    success: false,
    transactions: [],
    errors: [],
    warnings: [],
  };
  
  try {
    // Simple OFX parsing - extract STMTTRN blocks
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    const matches = content.matchAll(stmtTrnRegex);
    
    // Extract account number
    const acctIdMatch = content.match(/<ACCTID>([^<\n]+)/i);
    if (acctIdMatch) {
      result.accountNumber = acctIdMatch[1].trim();
    }
    
    // Extract bank ID
    const bankIdMatch = content.match(/<BANKID>([^<\n]+)/i);
    if (bankIdMatch) {
      result.bankCode = bankIdMatch[1].trim().toLowerCase();
    }
    
    for (const match of matches) {
      const block = match[1];
      
      try {
        // Extract fields
        const typeMatch = block.match(/<TRNTYPE>([^<\n]+)/i);
        const dateMatch = block.match(/<DTPOSTED>([^<\n]+)/i);
        const amountMatch = block.match(/<TRNAMT>([^<\n]+)/i);
        const nameMatch = block.match(/<NAME>([^<\n]+)/i);
        const memoMatch = block.match(/<MEMO>([^<\n]+)/i);
        const fitIdMatch = block.match(/<FITID>([^<\n]+)/i);
        const refMatch = block.match(/<REFNUM>([^<\n]+)/i);
        
        if (!dateMatch || !amountMatch) {
          result.warnings.push('Transaction missing date or amount');
          continue;
        }
        
        // Parse OFX date (YYYYMMDD or YYYYMMDDHHMMSS)
        const dateStr = dateMatch[1].trim();
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const date = new Date(year, month, day);
        
        if (isNaN(date.getTime())) {
          result.warnings.push(`Invalid OFX date: ${dateStr}`);
          continue;
        }
        
        const amount = parseFloat(amountMatch[1].trim());
        if (isNaN(amount)) {
          result.warnings.push(`Invalid OFX amount: ${amountMatch[1]}`);
          continue;
        }
        
        const description = (nameMatch?.[1] || memoMatch?.[1] || 'Unknown').trim();
        
        const transaction: ParsedTransaction = {
          transactionDate: date,
          description,
          reference: fitIdMatch?.[1]?.trim() || refMatch?.[1]?.trim(),
          rawData: { type: typeMatch?.[1]?.trim(), fitId: fitIdMatch?.[1]?.trim() },
        };
        
        // Positive = credit, Negative = debit
        if (amount >= 0) {
          transaction.credit = amount;
        } else {
          transaction.debit = Math.abs(amount);
        }
        
        result.transactions.push(transaction);
      } catch (err) {
        result.warnings.push(`OFX transaction parse error: ${(err as Error).message}`);
      }
    }
    
    // Also check for QFX/OFX 2.0 format
    if (result.transactions.length === 0) {
      // Try parsing XML-style OFX
      const xmlStmtTrnRegex = /<STMTTRN>\s*<TRNTYPE>([^<]+)<\/TRNTYPE>\s*<DTPOSTED>([^<]+)<\/DTPOSTED>\s*<TRNAMT>([^<]+)<\/TRNAMT>\s*(?:<FITID>([^<]+)<\/FITID>)?\s*(?:<NAME>([^<]+)<\/NAME>)?/gi;
      const xmlMatches = content.matchAll(xmlStmtTrnRegex);
      
      for (const match of xmlMatches) {
        const [, type, dateStr, amtStr, fitId, name] = match;
        
        try {
          const year = parseInt(dateStr.substring(0, 4));
          const month = parseInt(dateStr.substring(4, 6)) - 1;
          const day = parseInt(dateStr.substring(6, 8));
          const date = new Date(year, month, day);
          
          const amount = parseFloat(amtStr);
          
          if (!isNaN(date.getTime()) && !isNaN(amount)) {
            const transaction: ParsedTransaction = {
              transactionDate: date,
              description: name?.trim() || type?.trim() || 'Transaction',
              reference: fitId?.trim(),
              rawData: { type },
            };
            
            if (amount >= 0) {
              transaction.credit = amount;
            } else {
              transaction.debit = Math.abs(amount);
            }
            
            result.transactions.push(transaction);
          }
        } catch (err) {
          // Skip invalid entries
        }
      }
    }
    
    result.success = result.transactions.length > 0;
    
    if (result.transactions.length > 0) {
      const dates = result.transactions.map(t => t.transactionDate).sort((a, b) => a.getTime() - b.getTime());
      result.statementPeriod = {
        from: dates[0],
        to: dates[dates.length - 1],
      };
    }
    
    if (result.transactions.length === 0) {
      result.errors.push('No transactions found in OFX file');
    }
    
  } catch (err) {
    result.errors.push(`OFX parse error: ${(err as Error).message}`);
  }
  
  return result;
}

/**
 * Detect file type and parse accordingly
 */
export function parseStatement(content: string, fileName?: string, bankCode?: string): ParseResult {
  const lowerName = (fileName || '').toLowerCase();
  const trimmedContent = content.trim();
  
  // Detect OFX/QFX format
  if (
    lowerName.endsWith('.ofx') ||
    lowerName.endsWith('.qfx') ||
    trimmedContent.includes('OFXHEADER:') ||
    trimmedContent.includes('<OFX>') ||
    trimmedContent.includes('<STMTTRN>')
  ) {
    return parseOFX(content);
  }
  
  // Default to CSV
  return parseGenericCSV(content, bankCode);
}

/**
 * Get list of supported Malaysian banks
 */
export function getSupportedBanks() {
  return [
    { code: 'maybank', name: 'Maybank', swiftCode: 'MABORB2X' },
    { code: 'cimb', name: 'CIMB Bank', swiftCode: 'CIBBMYKL' },
    { code: 'publicbank', name: 'Public Bank', swiftCode: 'PABORB2X' },
    { code: 'rhb', name: 'RHB Bank', swiftCode: 'RHBBMYKL' },
    { code: 'hongleong', name: 'Hong Leong Bank', swiftCode: 'HLBBMYKL' },
    { code: 'ambank', name: 'AmBank', swiftCode: 'ARBKMYKL' },
    { code: 'uob', name: 'UOB Malaysia', swiftCode: 'UOVBMYKL' },
    { code: 'ocbc', name: 'OCBC Bank', swiftCode: 'OCBCMYKL' },
    { code: 'hsbc', name: 'HSBC Malaysia', swiftCode: 'HBMBMYKL' },
    { code: 'standardchartered', name: 'Standard Chartered', swiftCode: 'SCBLMYKX' },
    { code: 'bankislam', name: 'Bank Islam', swiftCode: 'BIMBMYKL' },
    { code: 'bankrakyat', name: 'Bank Rakyat', swiftCode: 'BKRMMYKL' },
    { code: 'affinbank', name: 'Affin Bank', swiftCode: 'PHBMMYKL' },
    { code: 'alliancebank', name: 'Alliance Bank', swiftCode: 'MFBBMYKL' },
  ];
}

export default {
  parseMaybankCSV,
  parseCIMBCSV,
  parseGenericCSV,
  parseOFX,
  parseStatement,
  getSupportedBanks,
};
