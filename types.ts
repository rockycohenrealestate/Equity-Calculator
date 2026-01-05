export interface FormData {
  currentHomeValue: string;
  currentMortgage: string;
  currentMonthlyPayment: string;
  otherDebts: string;
  monthlyDebtPayments: string;
  additionalSavings: string;
  newHomePrice: string;
  newInterestRate: string;
  loanTerm: string;
  annualTaxes: string;
  annualInsurance: string;
  debtPayoffPercentage: string;
}

export interface CalculationResults {
  homeEquity: number;
  netEquity: number;
  newLoanAmount: number;
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  paymentDifference: number;
  debtsPaidOff: number;
  remainingMonthlyDebtPayments: number;
  monthlyDebtPaymentsEliminated: number;
}
