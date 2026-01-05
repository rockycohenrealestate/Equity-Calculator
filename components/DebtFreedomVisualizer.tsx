import React, { useEffect, useState } from 'react';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
};

interface DebtFreedomVisualizerProps {
  oldMortgagePayment: number;
  oldDebtPayment: number;
  newMortgagePayment: number;
  remainingDebtPayment: number;
}

const DebtFreedomVisualizer: React.FC<DebtFreedomVisualizerProps> = ({ oldMortgagePayment, oldDebtPayment, newMortgagePayment, remainingDebtPayment }) => {
    const oldTotal = oldMortgagePayment + oldDebtPayment;
    const newTotal = newMortgagePayment + remainingDebtPayment;

    const [animate, setAnimate] = useState(false);
    useEffect(() => {
        setAnimate(false);
        const timer = setTimeout(() => setAnimate(true), 100);
        return () => clearTimeout(timer);
    }, [oldMortgagePayment, oldDebtPayment, newMortgagePayment, remainingDebtPayment]);

    const maxPayment = Math.max(oldTotal, newTotal, 1);

    const oldMortgageWidth = (oldMortgagePayment / maxPayment) * 100;
    const oldDebtWidth = (oldDebtPayment / maxPayment) * 100;

    const newMortgageWidth = (newMortgagePayment / maxPayment) * 100;
    const remainingDebtWidth = (remainingDebtPayment / maxPayment) * 100;

    const BarText: React.FC<{label: string, value: number}> = ({label, value}) => (
        <div className="truncate px-1 animate-fade-in-scale">
            <span className="block">{label}</span>
            <span className="block font-normal">{formatCurrency(value)}</span>
        </div>
    );

    return (
        <div className="space-y-4 my-6 p-4 border rounded-lg bg-gray-100/50">
            <h3 className="text-lg font-semibold text-gray-800 text-center">Monthly Payment Transformation</h3>
            <div className="space-y-3 text-gray-700">
                {/* Before Bar */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">Before Total</span>
                        <span className="font-bold">{formatCurrency(oldTotal)}</span>
                    </div>
                    <div className="w-full h-12 bg-gray-200 rounded-md flex overflow-hidden">
                        <div style={{ width: `${oldMortgageWidth}%` }} className="h-full flex items-center justify-center text-xs font-bold text-white text-center bg-sky-500">
                             {oldMortgageWidth > 10 && <BarText label="Mortgage" value={oldMortgagePayment} />}
                        </div>
                        <div style={{ width: `${oldDebtWidth}%` }} className="h-full flex items-center justify-center text-xs font-bold text-white text-center bg-orange-500">
                            {oldDebtWidth > 10 && <BarText label="Other Debts" value={oldDebtPayment} />}
                        </div>
                    </div>
                </div>

                {/* After Bar */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">After Total</span>
                        <span className="font-bold">{formatCurrency(newTotal)}</span>
                    </div>
                    <div className="w-full h-12 bg-gray-200 rounded-md flex overflow-hidden">
                        <div
                            style={{ width: animate ? `${newMortgageWidth}%` : '0%' }}
                            className="h-full bg-sky-700 transition-all duration-700 ease-out flex items-center justify-center text-xs font-bold text-white text-center"
                        >
                            {animate && newMortgageWidth > 10 && <BarText label="New Mortgage" value={newMortgagePayment} />}
                        </div>
                         <div
                            style={{ width: animate ? `${remainingDebtWidth}%` : '0%' }}
                            className="h-full bg-orange-700 transition-all duration-700 ease-out flex items-center justify-center text-xs font-bold text-white text-center"
                        >
                            {animate && remainingDebtWidth > 10 && <BarText label="Remaining Debt" value={remainingDebtPayment} />}
                        </div>
                    </div>
                </div>
            </div>
             <p className="text-xs text-center text-gray-500 italic mt-2">The "After" bar shows your new mortgage payment plus any remaining monthly debt payments based on your payoff priority.</p>
        </div>
    );
};

export default DebtFreedomVisualizer;