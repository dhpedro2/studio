/**
 * Represents a bank account.
 */
export interface BankAccount {

  /**
   * The account number.
   */
  accountNumber: string;
  /**
   * The account holder's name.
   */
  accountHolderName: string;
  /**
   * The current balance.
   */
  balance: number;
}

export interface YieldDataPoint {
  date: string;
  yield: number;
}

const dailyYieldData: YieldDataPoint[] = [];


/**
 * The annual interest rate for the "caixinha" (savings box) in decimal form.
 */
const ANNUAL_INTEREST_RATE = 0.14; // 14%
const WORKING_DAYS = 252; // Approximately 252 working days in a year in Brazil
}

/**
 * Asynchronously retrieves bank account information for a given account number.
 *
 * @param accountNumber The account number to retrieve information for.
 * @returns A promise that resolves to a BankAccount object.
 */
export async function getBankAccount(accountNumber: string): Promise<BankAccount> {
  // TODO: Implement this by calling an API.

  return {
    accountNumber: accountNumber,
    accountHolderName: 'Pedro',
    balance: 1000,
  };
}

/**
 * Asynchronously transfers funds from one account to another.
 *
 * @param fromAccountNumber The account number to transfer funds from.
 * @param toAccountNumber The account number to transfer funds to.
 * @param amount The amount to transfer.
 * @returns A promise that resolves to true if the transfer was successful, false otherwise.
 */
export async function transferFunds(fromAccountNumber: string, toAccountNumber: string, amount: number): Promise<boolean> {
  // TODO: Implement this by calling an API.

  return true;
}


/**
 * Calculates the daily yield for the "caixinha" (savings box) based on compound interest.
 *
 * @param currentBalance The current balance in the "caixinha".
 * @returns The daily yield amount.
 */
export function calculateDailyYield(currentBalance: number): number {
  const dailyInterestRate = ANNUAL_INTEREST_RATE / WORKING_DAYS;
  const dailyYield = currentBalance * dailyInterestRate;
  
  const lastYieldData = dailyYieldData[dailyYieldData.length - 1];

  // If there's previous data, add the yield to the last balance to calculate compound interest
  if (lastYieldData) {
    const lastBalance = lastYieldData.balance
    const newDailyYield = (lastBalance + dailyYield) * dailyInterestRate;
    const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format
    dailyYieldData.push({ date: today, yield: newDailyYield, balance: lastBalance + newDailyYield});
    return newDailyYield;
  } else{
    const today = new Date().toISOString().split('T')[0]; // Get today's date in 'YYYY-MM-DD' format
    dailyYieldData.push({ date: today, yield: dailyYield, balance: currentBalance + dailyYield});
    return dailyYield;
  }
  
}

/**
 * Retrieves the yield data for the "caixinha" (savings box).
 *
 * @returns An array of yield data points.
 */
export function getYieldData(): YieldDataPoint[] {
  return dailyYieldData.map(item => ({ date: item.date, yield: item.yield }));
}
