
import React, { useState, useEffect, useCallback } from 'react';
import { FormData, CalculationResults } from './types';
import { getMarketInsight, getHouseImage, getEstimatedHomeValue } from './services/geminiService';
import InputGroup from './components/InputGroup';
import ResultsCard from './components/ResultsCard';
import DebtFreedomVisualizer from './components/DebtFreedomVisualizer';
import { HomeIcon, DollarSignIcon, CreditCardIcon, PercentIcon, CalendarIcon, ArrowUpIcon, ArrowDownIcon, PhoneIcon, LocationMarkerIcon, XIcon, EnvelopeIcon, UserIcon, UsersIcon, CheckIcon, ClipboardIcon, ShareIcon, FacebookIcon, TwitterIcon, LinkedInIcon, LinkIcon } from './components/icons';

// Using a high-quality placeholder. To use your own image:
// 1. Download it from Canva as a JPG or PNG.
// 2. Upload it to a free image hosting service (like postimages.org).
// 3. Replace the URL below with the "Direct Link" provided by the hosting service.
const footerImage = 'https://lh3.googleusercontent.com/p/AF1QipNKXCFltfLQ2Pd6ycTTBuayWMwprohLQ8K1XvyD=s1360-w1360-h1020-rw';
const headshotImage = 'https://lh3.googleusercontent.com/p/AF1QipM8mBqrQR_rFUqN1kG2r8vV6SYY94w4OzkIhuZw=s1360-w1360-h1020-rw';

const LoadingBar: React.FC = () => (
    <div className="loading-bar" role="progressbar" aria-busy="true" aria-label="AI is processing your request" />
);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const ResultsSliders: React.FC<{ 
  formData: FormData, 
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}> = ({ formData, handleInputChange }) => {
  const formattedHomePrice = formatCurrency(parseFloat(formData.newHomePrice) || 0);
  const formattedSavings = formatCurrency(parseFloat(formData.additionalSavings) || 0);
  const formattedDebtPayoff = `${formData.debtPayoffPercentage}%`;

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">Explore Scenarios</h3>
      <div className="space-y-6 max-w-xl mx-auto">
        <div>
          <label htmlFor="newHomePriceSlider" className="flex justify-between items-center text-sm font-medium text-gray-700 mb-2">
            <span>Desired New Home Price</span>
            <span className="font-bold text-gray-900 text-base bg-yellow-100 px-2 py-1 rounded">{formattedHomePrice}</span>
          </label>
          <input
            type="range"
            id="newHomePriceSlider"
            name="newHomePrice"
            min="100000"
            max="2000000"
            step="5000"
            value={formData.newHomePrice}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="additionalSavingsSlider" className="flex justify-between items-center text-sm font-medium text-gray-700 mb-2">
            <span>Additional Savings</span>
            <span className="font-bold text-gray-900 text-base bg-yellow-100 px-2 py-1 rounded">{formattedSavings}</span>
          </label>
          <input
            type="range"
            id="additionalSavingsSlider"
            name="additionalSavings"
            min="0"
            max="200000"
            step="1000"
            value={formData.additionalSavings}
            onChange={handleInputChange}
            className="w-full"
          />
        </div>
         <div>
          <label htmlFor="debtPayoffPercentageSlider" className="flex justify-between items-center text-sm font-medium text-gray-700 mb-2">
            <span>Debt Payoff Priority</span>
            <span className="font-bold text-gray-900 text-base bg-yellow-100 px-2 py-1 rounded">{formattedDebtPayoff}</span>
          </label>
          <input
            type="range"
            id="debtPayoffPercentageSlider"
            name="debtPayoffPercentage"
            min="0"
            max="100"
            step="5"
            value={formData.debtPayoffPercentage}
            onChange={handleInputChange}
            className="w-full"
          />
           <p className="text-xs text-gray-500 mt-1 text-center">How much of your non-mortgage debt do you want to pay off with your equity?</p>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    currentHomeValue: '500000',
    currentMortgage: '250000',
    currentMonthlyPayment: '1800',
    otherDebts: '25000',
    monthlyDebtPayments: '1500',
    additionalSavings: '10000',
    newHomePrice: '750000',
    newInterestRate: '',
    loanTerm: '30',
    annualTaxes: '8000',
    annualInsurance: '2000',
    debtPayoffPercentage: '100',
  });

  const [results, setResults] = useState<CalculationResults | null>(null);
  const [insight, setInsight] = useState<string>('');
  const [houseImageUrl, setHouseImageUrl] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactFormErrors, setContactFormErrors] = useState({ name: '', email: '', phone: '', message: '' });
  const [isContactFormSubmitted, setIsContactFormSubmitted] = useState<boolean>(false);
  const [generatedEmailBody, setGeneratedEmailBody] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [shareResultsStatus, setShareResultsStatus] = useState<'idle' | 'copied'>('idle');
  const [isLinkCopied, setIsLinkCopied] = useState<boolean>(false);
  const [userCount, setUserCount] = useState<number | null>(null);

  
  const [calculationErrors, setCalculationErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [generalCalcError, setGeneralCalcError] = useState<string>('');


  // State for home value estimation
  const [address, setAddress] = useState({ street: '', city: 'Manitowoc', zip: '54220' });
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [estimationError, setEstimationError] = useState<string>('');

  const isAILoading = isEstimating || isLoadingInsight;

  useEffect(() => {
    if (sessionStorage.getItem('contactFormSubmitted') === 'true') {
      setIsContactFormSubmitted(true);
      setGeneratedEmailBody(sessionStorage.getItem('generatedEmailBody') || '');
    }
  }, []);

  useEffect(() => {
    const STORAGE_KEY = 'userCounterData';
    let initialCount = 1472; // Starting base number to look populated

    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const { baseCount, lastUpdated } = JSON.parse(storedData);
        // Simulate growth since last visit: 1 user every 5 minutes
        const minutesPassed = (Date.now() - lastUpdated) / (1000 * 60);
        const growth = Math.floor(minutesPassed / 5);
        initialCount = baseCount + growth;
      }
    } catch (e) {
      console.error("Failed to read user count from storage", e);
      // If parsing fails, we'll just use the default initialCount
    }

    setUserCount(initialCount);
    // Set initial or updated value in storage
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseCount: initialCount, lastUpdated: Date.now() }));

    const interval = setInterval(() => {
      setUserCount(prevCount => {
        if (prevCount === null) return null;
        const newCount = prevCount + 1;
        try {
          // Update storage with the new count and timestamp
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseCount: newCount, lastUpdated: Date.now() }));
        } catch (e) {
          console.error("Failed to save user count to storage", e);
        }
        return newCount;
      });
    }, 30000); // Increment every 30 seconds for a dynamic feel

    return () => clearInterval(interval);
  }, []);

  
  const calculateMonthlyPayment = (principal: number, annualRate: number, years: number): number => {
      if (principal <= 0 || annualRate <= 0 || years <= 0) return 0;
      const monthlyRate = annualRate / 100 / 12;
      const numberOfPayments = years * 12;
      if (monthlyRate === 0) return principal / numberOfPayments;
      const numerator = monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments);
      const denominator = Math.pow(1 + monthlyRate, numberOfPayments) - 1;
      return principal * (numerator / denominator);
  };

  const calculateResults = useCallback(() => {
    const errors: Partial<Record<keyof FormData, string>> = {};
    
    const currentHomeValue = parseFloat(formData.currentHomeValue) || 0;
    const currentMortgage = parseFloat(formData.currentMortgage) || 0;
    const currentMonthlyPayment = parseFloat(formData.currentMonthlyPayment) || 0;
    const otherDebts = parseFloat(formData.otherDebts) || 0;
    const monthlyDebtPayments = parseFloat(formData.monthlyDebtPayments) || 0;
    const additionalSavings = parseFloat(formData.additionalSavings) || 0;
    const newHomePrice = parseFloat(formData.newHomePrice) || 0;
    const newInterestRate = parseFloat(formData.newInterestRate) || 0;
    const loanTerm = parseInt(formData.loanTerm) || 0;
    const annualTaxes = parseFloat(formData.annualTaxes) || 0;
    const annualInsurance = parseFloat(formData.annualInsurance) || 0;
    const debtPayoffPercentage = (parseFloat(formData.debtPayoffPercentage) || 0) / 100;

    // Validation
    if (currentHomeValue <= 0) errors.currentHomeValue = 'Home value must be a positive number.';
    if (currentMortgage < 0) errors.currentMortgage = 'Mortgage balance cannot be negative.';
    if (currentMortgage > currentHomeValue) errors.currentMortgage = 'Mortgage cannot exceed home value.';
    if (currentMonthlyPayment < 0) errors.currentMonthlyPayment = 'Payment cannot be negative.';
    if (otherDebts < 0) errors.otherDebts = 'Debts cannot be negative.';
    
    if (monthlyDebtPayments < 0) {
      errors.monthlyDebtPayments = 'Debt payments cannot be negative.';
    } else if (otherDebts >= 0) { // Only do logical checks if otherDebts is valid
        if (otherDebts === 0 && monthlyDebtPayments > 0) {
            errors.monthlyDebtPayments = 'Cannot have monthly payments with zero total debt.';
        }
    }

    if (additionalSavings < 0) errors.additionalSavings = 'Savings cannot be negative.';
    if (newHomePrice <= 0) errors.newHomePrice = 'New home price must be a positive number.';
    if (newInterestRate <= 0 || newInterestRate > 25) errors.newInterestRate = 'Please enter a realistic interest rate.';
    if (loanTerm <= 0 || loanTerm > 50) errors.loanTerm = 'Please enter a realistic loan term.';
    if (annualTaxes < 0) errors.annualTaxes = 'Taxes cannot be negative.';
    if (annualInsurance < 0) errors.annualInsurance = 'Insurance cannot be negative.';
    
    setCalculationErrors(errors);

    if (Object.keys(errors).length > 0) {
        setResults(null);
        setGeneralCalcError('Please correct the errors highlighted below to see your results.');
        return;
    }
    
    setGeneralCalcError('');

    const homeEquity = currentHomeValue - currentMortgage;
    const debtsPaidOff = otherDebts * debtPayoffPercentage;
    const netEquity = homeEquity + additionalSavings - debtsPaidOff; // This is now available for down payment
    
    const newLoanAmount = newHomePrice > netEquity ? newHomePrice - netEquity : 0;
    
    const newMonthlyPrincipalAndInterest = calculateMonthlyPayment(newLoanAmount, newInterestRate, loanTerm);
    const newMonthlyTaxes = annualTaxes / 12;
    const newMonthlyInsurance = annualInsurance / 12;
    const newMonthlyPayment = newMonthlyPrincipalAndInterest + newMonthlyTaxes + newMonthlyInsurance;
    
    const remainingMonthlyDebtPayments = monthlyDebtPayments * (1 - debtPayoffPercentage);
    const monthlyDebtPaymentsEliminated = monthlyDebtPayments * debtPayoffPercentage;
    
    const currentTotalMonthlyOutlay = currentMonthlyPayment + monthlyDebtPayments;
    const newTotalMonthlyOutlay = newMonthlyPayment + remainingMonthlyDebtPayments;
    const paymentDifference = newTotalMonthlyOutlay - currentTotalMonthlyOutlay;

    setResults({
      homeEquity,
      netEquity,
      newLoanAmount,
      currentMonthlyPayment,
      newMonthlyPayment,
      paymentDifference,
      debtsPaidOff,
      remainingMonthlyDebtPayments,
      monthlyDebtPaymentsEliminated,
    });
  }, [formData]);

  useEffect(() => {
    calculateResults();
  }, [calculateResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };
  
  const formatPhoneNumber = (value: string) => {
    if (!value) return '';
    const phoneNumber = value.replace(/[^\d]/g, '');
    const truncated = phoneNumber.slice(0, 10);
    const length = truncated.length;

    if (length <= 3) {
      return truncated;
    }
    if (length <= 6) {
      return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`;
    }
    return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`;
  };

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
        const formattedPhoneNumber = formatPhoneNumber(value);
        setContactForm(prev => ({ ...prev, phone: formattedPhoneNumber }));
    } else {
        setContactForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleEstimateValue = async () => {
    if (!address.street || !address.city || !address.zip) {
      setEstimationError("Please enter a full address.");
      return;
    }
    setIsEstimating(true);
    setEstimationError('');
    try {
      const fullAddress = `${address.street}, ${address.city}, WI ${address.zip}`;
      const value = await getEstimatedHomeValue(fullAddress);
      setFormData(prev => ({ ...prev, currentHomeValue: value.toString() }));
    } catch (err) {
      setEstimationError("Could not retrieve an estimate. Please try again or enter a value manually.");
    } finally {
      setIsEstimating(false);
    }
  };

  const validateContactForm = () => {
      const errors = { name: '', email: '', phone: '', message: '' };
      let isValid = true;

      if (!contactForm.name.trim()) {
          errors.name = 'Name is required.';
          isValid = false;
      }

      if (!contactForm.email.trim()) {
          errors.email = 'Email is required.';
          isValid = false;
      } else if (!/^\S+@\S+\.\S+$/.test(contactForm.email)) {
          errors.email = 'Please enter a valid email address.';
          isValid = false;
      }

      const phoneDigits = contactForm.phone.replace(/\D/g, '');
      if (phoneDigits.length === 0) {
          errors.phone = 'Phone number is required.';
          isValid = false;
      } else if (phoneDigits.length < 10) {
          errors.phone = 'Please enter a complete 10-digit phone number.';
          isValid = false;
      }

      if (!contactForm.message.trim()) {
          errors.message = 'Message is required.';
          isValid = false;
      }

      setContactFormErrors(errors);
      return isValid;
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateContactForm()) {
        return;
    }
    
    const resultsSummary = results ? `
--- Calculator Summary ---
Current Home Value: ${formatCurrency(parseFloat(formData.currentHomeValue))}
New Home Price: ${formatCurrency(parseFloat(formData.newHomePrice))}
Available for Down Payment: ${formatCurrency(results.netEquity)}
Debts Paid Off: ${formatCurrency(results.debtsPaidOff)} (${formData.debtPayoffPercentage}%)
Estimated New Monthly Payment (PITI): ${formatCurrency(results.newMonthlyPayment)}
--------------------------
    `.trim() : 'No calculation results available.';

    const body =
`A new inquiry has been submitted from the Equity to Opportunity Calculator.

--- Client Details ---
Name: ${contactForm.name}
Email: ${contactForm.email}
Phone: ${contactForm.phone}
--------------------

Message:
${contactForm.message}

${resultsSummary}
`;
    
    setGeneratedEmailBody(body);
    sessionStorage.setItem('contactFormSubmitted', 'true');
    sessionStorage.setItem('generatedEmailBody', body);
    setIsContactFormSubmitted(true);

    const recipient = 'RockyCohenRealEstate@gmail.com';
    const subject = `Inquiry from Equity Calculator: ${contactForm.name}`;
    const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // This will attempt to open the mail client. 
    // The component will re-render with the success UI, which acts as the fallback.
    window.location.href = mailtoLink;
  };
  
  const handleCopy = () => {
    if (generatedEmailBody) {
      navigator.clipboard.writeText(generatedEmailBody).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000); // Reset after 3 seconds
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  };

  const handleResetForm = () => {
    setIsContactFormSubmitted(false);
    setGeneratedEmailBody('');
    setIsCopied(false);
    sessionStorage.removeItem('contactFormSubmitted');
    sessionStorage.removeItem('generatedEmailBody');
    setContactForm({ name: '', email: '', phone: '', message: '' });
    setContactFormErrors({ name: '', email: '', phone: '', message: '' });
  };


  const handleGetInsight = async () => {
    if (!results || parseFloat(formData.newHomePrice) <= 0) return;
    setIsLoadingInsight(true);
    setError('');
    setInsight('');
    setHouseImageUrl('');
    try {
      const [insightText, imageUrl] = await Promise.all([
        getMarketInsight(parseFloat(formData.newHomePrice), results.newMonthlyPayment),
        getHouseImage(parseFloat(formData.newHomePrice))
      ]);
      setInsight(insightText);
      setHouseImageUrl(imageUrl);
    } catch (err)
 {
      setError('Failed to get AI insights. Please check your API key and try again.');
    } finally {
      setIsLoadingInsight(false);
    }
  };

  const handleShareResults = async () => {
    if (!results) return;

    const summaryText = `I just used the Equity to Opportunity Calculator! My estimated new monthly payment could be ${formatCurrency(results.newMonthlyPayment)}. I could use ${formatCurrency(results.netEquity)} for a down payment after potentially paying off ${formatCurrency(results.debtsPaidOff)} in debt. Check out the calculator for yourself!`;
    const shareData = {
        title: 'My Equity to Opportunity Results',
        text: summaryText,
        url: window.location.href,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.error("Share failed:", err);
        }
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(`${summaryText}\n\n${window.location.href}`).then(() => {
            setShareResultsStatus('copied');
            setTimeout(() => setShareResultsStatus('idle'), 3000);
        });
    }
  };
  
  const canGetInsight = results && formData.newHomePrice && parseFloat(formData.newHomePrice) > 0;

  const analysisMailto = () => {
    const subject = "Request for Detailed Market Analysis";
    const body = `Hi Rocky,

I was using the Equity to Opportunity calculator and I'm interested in getting a more detailed market analysis for my property.

Here are some details to get you started: [Please enter below]
Address:
Any updates since purchasing:
Other things to note (1 story/2 story, needs some TLC, etc.):

I look forward to this no pressure, information to help plan my next move!
[Your Name]`;
    return `mailto:RockyCohenRealEstate@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  
  const appUrl = window.location.href;
  const shareText = "Feeling locked in by your low interest rate? This calculator shows the hidden opportunity in your home equity! Check it out. #ManitowocRealEstate #HomeEquity";
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(shareText)}`;
  const linkedinShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(appUrl)}&title=${encodeURIComponent("Equity to Opportunity Calculator")}&summary=${encodeURIComponent(shareText)}`;

  const handleCopyLink = () => {
      navigator.clipboard.writeText(appUrl).then(() => {
          setIsLinkCopied(true);
          setTimeout(() => setIsLinkCopied(false), 3000);
      });
  };

  return (
    <div className="min-h-screen bg-[#1a2634] text-gray-200 font-sans">
      {isAILoading && <LoadingBar />}
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="text-center mb-10 font-c21 slide-up">
          <h1 className="text-4xl font-bold text-[#eac567]">Equity to Opportunity Calculator</h1>
          <p className="text-lg text-gray-400 italic mt-2">Feeling locked in to your low interest rate? Let's see if there might be hidden opportunity in your home equity!</p>
        </header>

        <section className="mb-10 max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center slide-up" style={{ animationDelay: '100ms' }}>
            <div className="md:col-span-2 text-center md:text-left">
                <h2 className="text-2xl font-semibold text-[#eac567] mb-3">How This Works</h2>
                <p className="text-gray-400">
                    This artificial intelligence (AI) calculator estimates the equity in your current home. (If you prefer a more accurate market analysis, please <a href={analysisMailto()} className="text-yellow-600 hover:text-yellow-500 underline font-medium">contact me directly</a>.) It then shows you how that equity—plus any savings—could be used to pay off higher interest debts and serve as a down payment on your next home. Enter your numbers below and let's see what's possible!
                    <span className="block mt-2 italic text-gray-500">#StartWithCoffee #CloseWithAToast</span>
                </p>
            </div>
            <div className="md:col-span-1">
                <img src={headshotImage} alt="Headshot of Rocky Cohen, a real estate agent" className="w-48 h-48 rounded-full object-cover mx-auto border-4 border-[#eac567] shadow-lg" />
                <div className="text-center mt-4">
                  <p className="font-semibold text-gray-200 text-xl">Rocky Cohen</p>
                  <p className="text-gray-400">Century 21 Aspire Group</p>
                </div>
            </div>
        </section>

        <main className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-2 bg-gray-50 p-6 rounded-xl shadow-lg border border-gray-200 card slide-up" style={{ animationDelay: '200ms' }}>
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Step 1: Your Current Situation</h2>
            <div className="space-y-6">
              <fieldset className="border-t border-gray-200 pt-4">
                <legend className="text-lg font-medium text-[#eac567] mb-2">Your Current Home</legend>
                <div className="space-y-4 p-4 border border-gray-200 bg-gray-100/50 rounded-lg">
                    <h3 className="text-md font-semibold text-gray-700">AI Home Value Estimator</h3>
                    <div>
                        <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <LocationMarkerIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input type="text" name="street" id="street" value={address.street} onChange={handleAddressChange} placeholder="123 Main St" className="block w-full rounded-md border-gray-300 bg-white text-gray-900 pl-10 focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"/>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
                            <input type="text" name="city" id="city" value={address.city} onChange={handleAddressChange} className="block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"/>
                        </div>
                        <div>
                            <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                            <input type="text" name="zip" id="zip" value={address.zip} onChange={handleAddressChange} placeholder="54220" className="block w-full rounded-md border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm"/>
                        </div>
                    </div>
                    <button onClick={handleEstimateValue} disabled={isAILoading} className="w-full flex justify-center items-center space-x-2 bg-[#eac567] text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-500 disabled:bg-yellow-900/50 disabled:text-gray-500 transition-colors">
                        <HomeIcon className="w-5 h-5"/>
                        <span>{isEstimating ? 'Estimating...' : 'Estimate My Home Value'}</span>
                    </button>
                    {estimationError && <p className="text-xs text-red-600 text-center mt-1">{estimationError}</p>}
                </div>
                <div className="space-y-4 mt-4">
                  <InputGroup label="Home Value (use estimate or enter manually)" name="currentHomeValue" value={formData.currentHomeValue} onChange={handleInputChange} placeholder="300,000" icon={<HomeIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.currentHomeValue} />
                  <p className="text-xs text-gray-500 -mt-2 px-1">
                    This is an AI-powered estimate, and may not reflect your actual market value.{" "}
                    <a href={analysisMailto()} className="text-yellow-600 hover:text-yellow-500 underline font-medium">
                        Contact me
                    </a>
                    {" "}for a detailed market analysis.
                  </p>
                  <InputGroup label="Current Mortgage Balance" name="currentMortgage" value={formData.currentMortgage} onChange={handleInputChange} placeholder="150,000" icon={<DollarSignIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.currentMortgage} />
                  <div>
                    <InputGroup label="Current Monthly Mortgage Payment (PITI)" name="currentMonthlyPayment" value={formData.currentMonthlyPayment} onChange={handleInputChange} placeholder="1800" icon={<DollarSignIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.currentMonthlyPayment} />
                    <p className="text-xs text-gray-500 mt-1 px-1">Your total monthly Principal, Interest, Taxes & Insurance payment.</p>
                  </div>
                </div>
              </fieldset>
              
              <fieldset className="border-t border-gray-200 pt-4">
                <legend className="text-lg font-medium text-[#eac567] mb-2">Your Future Plans</legend>
                 <div className="space-y-4">
                  <InputGroup label="Total Other Debts (car loans, credit cards, student loans, etc.)" name="otherDebts" value={formData.otherDebts} onChange={handleInputChange} placeholder="20,000" icon={<CreditCardIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.otherDebts} />
                  <InputGroup label="Total of Monthly Payments Toward Debts" name="monthlyDebtPayments" value={formData.monthlyDebtPayments} onChange={handleInputChange} placeholder="1500" icon={<DollarSignIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.monthlyDebtPayments} />
                  <InputGroup label="Additional Savings for Down Payment" name="additionalSavings" value={formData.additionalSavings} onChange={handleInputChange} placeholder="10,000" icon={<DollarSignIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.additionalSavings} />
                  <InputGroup label="Desired New Home Price" name="newHomePrice" value={formData.newHomePrice} onChange={handleInputChange} placeholder="500,000" icon={<HomeIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.newHomePrice} />
                  <div>
                    <InputGroup label="New Interest Rate" name="newInterestRate" value={formData.newInterestRate} onChange={handleInputChange} placeholder="6.5" icon={<PercentIcon className="w-5 h-5 text-gray-500"/>} isPercent error={calculationErrors.newInterestRate}/>
                    <p className="text-xs text-gray-500 mt-1 px-1">
                      Enter a <a href="https://www.google.com/search?q=average+30+year+mortgage+interest+rate" target="_blank" rel="noopener noreferrer" className="text-yellow-600 hover:text-yellow-500 underline font-medium">current market average</a>, or adjust if you have a specific rate quote.
                    </p>
                  </div>
                  <InputGroup label="Est. Annual Property Taxes (Optional)" name="annualTaxes" value={formData.annualTaxes} onChange={handleInputChange} placeholder="8000" icon={<DollarSignIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.annualTaxes} />
                  <InputGroup label="Est. Annual Homeowners Insurance (Optional)" name="annualInsurance" value={formData.annualInsurance} onChange={handleInputChange} placeholder="2000" icon={<DollarSignIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.annualInsurance} />
                  <InputGroup label="Loan Term (Years)" name="loanTerm" value={formData.loanTerm} onChange={handleInputChange} placeholder="30" icon={<CalendarIcon className="w-5 h-5 text-gray-500"/>} error={calculationErrors.loanTerm}/>
                 </div>
              </fieldset>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3 slide-up" style={{ animationDelay: '300ms' }}>
            <div className="bg-gray-50 text-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 card">
              <h2 className="text-2xl font-semibold mb-6">Step 2: Your Opportunity</h2>
              {results ? (
                <div className="fade-in">
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-center mb-6">
                    <p className="text-green-800">
                      By moving, you could eliminate <strong className="font-bold">{formatCurrency(results.monthlyDebtPaymentsEliminated)}</strong> in high-interest debt payments each month. While your new mortgage rate might be higher, you're consolidating payments into a single, wealth-building asset.
                    </p>
                  </div>

                  <DebtFreedomVisualizer
                    key={JSON.stringify(results)}
                    oldMortgagePayment={results.currentMonthlyPayment}
                    oldDebtPayment={parseFloat(formData.monthlyDebtPayments) || 0}
                    newMortgagePayment={results.newMonthlyPayment}
                    remainingDebtPayment={results.remainingMonthlyDebtPayments}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">Equity Breakdown</h3>
                          <dl className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                  <dt className="text-gray-600">Total Home Equity</dt>
                                  <dd className="font-medium text-gray-900">{formatCurrency(results.homeEquity)}</dd>
                              </div>
                              <div className="flex justify-between items-center">
                                  <dt className="text-gray-600 pl-4">- Less Debts Paid Off</dt>
                                  <dd className="font-medium text-red-500">-{formatCurrency(results.debtsPaidOff)}</dd>
                              </div>
                              <div className="flex justify-between items-center">
                                  <dt className="text-gray-600 pl-4">+ Plus Additional Savings</dt>
                                  <dd className="font-medium text-green-500">+{formatCurrency(parseFloat(formData.additionalSavings) || 0)}</dd>
                              </div>
                              <div className="flex justify-between items-center border-t pt-2 mt-2">
                                  <dt className="font-bold text-gray-800">Available for Down Payment</dt>
                                  <dd className="font-bold text-green-600 text-base">{formatCurrency(results.netEquity)}</dd>
                              </div>
                          </dl>
                      </div>

                      <div className="p-4 border border-sky-200 bg-sky-50 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Monthly Payment Breakdown</h3>
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <dt className="text-gray-600">Total Old Monthly Payments</dt>
                                <dd className="font-medium text-gray-900">{formatCurrency(results.currentMonthlyPayment + (parseFloat(formData.monthlyDebtPayments) || 0))}</dd>
                            </div>
                             <div className="flex justify-between items-center">
                                <dt className="text-gray-600">Total New Monthly Payments</dt>
                                <dd className="font-medium text-gray-900">{formatCurrency(results.newMonthlyPayment + results.remainingMonthlyDebtPayments)}</dd>
                            </div>
                             <p className="text-xs text-gray-500 pl-4">(New Mortgage + Remaining Debts)</p>
                            <div className="flex justify-between items-center border-t pt-2 mt-2">
                                <dt className="font-bold text-gray-800">Overall Monthly Change</dt>
                                <dd className={`font-bold text-base flex items-center gap-1 ${results.paymentDifference >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {results.paymentDifference >= 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                                    {formatCurrency(Math.abs(results.paymentDifference))}
                                </dd>
                            </div>
                        </dl>
                    </div>
                  </div>


                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ResultsCard label="Total Home Equity" value={formatCurrency(results.homeEquity)} description="Your home's value minus mortgage." />
                    <ResultsCard label="Available for Down Payment" value={formatCurrency(results.netEquity)} description={`Equity + savings after paying off ${formatCurrency(results.debtsPaidOff)} in debts.`} colorClass="text-green-500"/>
                    <ResultsCard label="New Loan Amount" value={formatCurrency(results.newLoanAmount)} description="The mortgage for your new home." />
                    <ResultsCard label="New Monthly PITI" value={formatCurrency(results.newMonthlyPayment)} description="New mortgage Principal, Interest, Taxes & Insurance." />
                  </div>

                  <ResultsSliders 
                    formData={formData} 
                    handleInputChange={handleInputChange} 
                  />

                  <div className="mt-8 text-center border-t border-gray-200 pt-6">
                      <button
                          onClick={handleShareResults}
                          disabled={!results}
                          className="inline-flex items-center gap-x-2 bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                          {shareResultsStatus === 'copied' ? <CheckIcon className="w-5 h-5" /> : <ShareIcon className="w-5 h-5" />}
                          {shareResultsStatus === 'copied' ? 'Results Copied!' : 'Share My Results'}
                      </button>
                      {results && !navigator.share && <p className="text-xs text-gray-500 mt-2">Your browser doesn't support direct sharing. Results will be copied to your clipboard.</p>}
                  </div>

                </div>
              ) : (
                <div className="text-center py-10">
                  {generalCalcError ? (
                    <p className="font-semibold text-red-600">{generalCalcError}</p>
                  ) : (
                    <p className="text-gray-500">Enter your financial details to see your results.</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-8 bg-gray-50 p-6 rounded-xl shadow-lg border border-gray-200 card">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-gray-800">Step 3: A Glimpse of the Future</h2>
                    <button onClick={handleGetInsight} disabled={isAILoading || !canGetInsight} className="flex items-center space-x-2 bg-[#eac567] text-gray-900 font-semibold px-4 py-2 rounded-lg hover:bg-yellow-500 disabled:bg-yellow-900/50 disabled:text-gray-500 transition-colors">
                        <HomeIcon className="w-5 h-5" />
                        <span>{isLoadingInsight ? 'Analyzing...' : 'See the Future'}</span>
                    </button>
                </div>

                {isLoadingInsight && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                        <div className="animate-pulse bg-gray-200 rounded-lg aspect-video"></div>
                    </div>
                )}

                {error && <p className="text-red-500">{error}</p>}

                {!isLoadingInsight && !error && (!insight && !houseImageUrl) && (
                    <div>
                        {canGetInsight ? (
                            <p className="text-gray-600">Click the button to get an AI-powered perspective on your potential move in Manitowoc, WI, and see an AI-generated image of a home at this price point.</p>
                        ) : (
                            <p className="text-gray-600">Please fill out the form and ensure 'Desired New Home Price' has a valid value to enable AI insights.</p>
                        )}
                    </div>
                )}

                {!isLoadingInsight && (insight || houseImageUrl) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start fade-in">
                        <div className="prose max-w-none text-gray-600">
                            {insight && insight.split('\n').filter(p => p.trim()).map((paragraph, index) => (
                                <p key={index} dangerouslySetInnerHTML={{ __html: paragraph.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>') }} />
                            ))}
                        </div>
                        {houseImageUrl && (
                            <div>
                                <img src={houseImageUrl} alt={`Example of a home in Manitowoc County at the ${formatCurrency(parseFloat(formData.newHomePrice))} price point`} className="rounded-lg shadow-md w-full h-auto object-cover aspect-video" />
                                <p className="text-xs text-gray-500 mt-2 text-center">An AI-generated example of a home at this price point.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
          </div>
        </main>
        
        <section className="mt-12 slide-up" style={{ animationDelay: '400ms' }}>
            <div className="bg-gray-50 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto card">
                {isContactFormSubmitted ? (
                    <div className="text-center py-10 fade-in">
                        <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
                            <CheckIcon className="w-12 h-12 text-green-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800">Thank You!</h2>
                        <p className="mt-4 text-gray-600 max-w-xl mx-auto">
                           Your email client should have opened with the message pre-filled. If it didn't open, please copy the text below and paste it into a new email addressed to:
                        </p>
                        <p className="mt-2 font-semibold text-gray-800 bg-gray-100 px-3 py-2 rounded-md inline-block">RockyCohenRealEstate@gmail.com</p>

                        <div className="mt-6 text-left max-w-2xl mx-auto space-y-4">
                             <div className="p-4 rounded-lg bg-gray-100 border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm font-medium text-gray-500">Your message & calculation summary</p>
                                </div>
                                <pre className="mt-2 p-3 bg-white rounded text-xs text-gray-700 max-h-48 overflow-auto whitespace-pre-wrap font-sans">
                                    {generatedEmailBody}
                                </pre>
                            </div>
                        </div>
                        
                        <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
                            <button 
                                onClick={handleCopy}
                                className="inline-flex items-center gap-x-2 bg-[#eac567] text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm w-full sm:w-auto"
                            >
                                {isCopied ? <CheckIcon className="w-5 h-5"/> : <ClipboardIcon className="w-5 h-5"/>}
                                {isCopied ? 'Copied to Clipboard!' : 'Copy Message'}
                            </button>
                            <button 
                                onClick={handleResetForm}
                                className="inline-flex items-center gap-x-2 bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors shadow-sm w-full sm:w-auto"
                            >
                                Start Over
                            </button>
                        </div>
                         <p className="mt-6 text-gray-500 text-sm">Now, just open your email app, paste, and send!</p>
                    </div>
                ) : (
                    <>
                        <div className="text-center">
                            <h2 className="text-3xl font-bold text-gray-800">Ready to Dream Big?</h2>
                            <p className="mt-4 text-gray-500 max-w-xl mx-auto">Let's chat about your next chapter. On your timeline. Even if you're just beginning to think about the opportunities.</p>
                            <blockquote className="mt-8 p-8 bg-yellow-50 border-l-8 border-yellow-500 text-center max-w-xl mx-auto rounded-lg shadow-lg">
                              <p className="text-2xl text-gray-800 font-medium italic leading-relaxed">
                                "The secret of getting ahead is getting started."
                              </p>
                              <footer className="mt-6 text-base text-center not-italic text-gray-600">— Mark Twain</footer>
                            </blockquote>
                        </div>
                        <form onSubmit={handleContactSubmit} className="mt-8 max-w-lg mx-auto" noValidate>
                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
                                    <div className="relative mt-1 rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <UserIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input 
                                            type="text" 
                                            name="name" 
                                            id="name"
                                            value={contactForm.name}
                                            onChange={handleContactChange}
                                            className={`block w-full rounded-md sm:text-sm pl-10 ${contactFormErrors.name ? 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-500'}`}
                                            placeholder="Jane Doe"
                                            aria-invalid={!!contactFormErrors.name}
                                            aria-describedby={contactFormErrors.name ? 'name-error' : undefined}
                                        />
                                    </div>
                                    {contactFormErrors.name && <p className="mt-1 text-xs text-red-600" id="name-error">{contactFormErrors.name}</p>}
                                </div>
                                <div>
                                   <label htmlFor="email" className="block text-sm font-medium text-gray-700">Your Email</label>
                                   <div className="relative mt-1 rounded-md shadow-sm">
                                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input 
                                            type="email" 
                                            name="email" 
                                            id="email"
                                            value={contactForm.email}
                                            onChange={handleContactChange}
                                            className={`block w-full rounded-md sm:text-sm pl-10 ${contactFormErrors.email ? 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-500'}`}
                                            placeholder="you@example.com"
                                            aria-invalid={!!contactFormErrors.email}
                                            aria-describedby={contactFormErrors.email ? 'email-error' : undefined}
                                        />
                                    </div>
                                    {contactFormErrors.email && <p className="mt-1 text-xs text-red-600" id="email-error">{contactFormErrors.email}</p>}
                                </div>
                                <div>
                                   <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Your Phone</label>
                                   <div className="relative mt-1 rounded-md shadow-sm">
                                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                            <PhoneIcon className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input 
                                            type="tel" 
                                            name="phone" 
                                            id="phone"
                                            value={contactForm.phone}
                                            onChange={handleContactChange}
                                            className={`block w-full rounded-md sm:text-sm pl-10 ${contactFormErrors.phone ? 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-500'}`}
                                            placeholder="(555) 123-4567"
                                            aria-invalid={!!contactFormErrors.phone}
                                            aria-describedby={contactFormErrors.phone ? 'phone-error' : undefined}
                                        />
                                    </div>
                                    {contactFormErrors.phone && <p className="mt-1 text-xs text-red-600" id="phone-error">{contactFormErrors.phone}</p>}
                                </div>
                                <div>
                                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                                    <textarea 
                                        name="message" 
                                        id="message" 
                                        rows={4}
                                        value={contactForm.message}
                                        onChange={handleContactChange}
                                        className={`mt-1 block w-full rounded-md shadow-sm sm:text-sm ${contactFormErrors.message ? 'border-red-500 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 bg-white text-gray-900 focus:border-yellow-500 focus:ring-yellow-500'}`}
                                        placeholder="I'm thinking about my next home and would love to chat..."
                                        aria-invalid={!!contactFormErrors.message}
                                        aria-describedby={contactFormErrors.message ? 'message-error' : undefined}
                                    />
                                    {contactFormErrors.message && <p className="mt-1 text-xs text-red-600" id="message-error">{contactFormErrors.message}</p>}
                                </div>
                                <div className="text-center">
                                    <button type="submit" className="inline-flex items-center gap-x-2 bg-[#eac567] text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-yellow-500 transition-colors shadow-sm">
                                        <EnvelopeIcon className="w-5 h-5"/>
                                        Message Rocky
                                    </button>
                                </div>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </section>

        <section className="mt-12 slide-up" style={{ animationDelay: '450ms' }}>
            <div className="bg-gray-50 p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto card text-center">
                <h2 className="text-2xl font-bold text-gray-800">Share This Calculator</h2>
                <p className="mt-2 text-gray-500">Know someone who could benefit from this? Share it!</p>
                <div className="mt-6 flex justify-center items-center gap-4 flex-wrap">
                    <a href={facebookShareUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#1877F2] text-white hover:bg-opacity-90 transform hover:scale-110 transition-transform">
                        <FacebookIcon className="w-6 h-6" />
                    </a>
                    <a href={twitterShareUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on X" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black text-white hover:bg-opacity-90 transform hover:scale-110 transition-transform">
                        <TwitterIcon className="w-6 h-6" />
                    </a>
                    <a href={linkedinShareUrl} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0A66C2] text-white hover:bg-opacity-90 transform hover:scale-110 transition-transform">
                        <LinkedInIcon className="w-6 h-6" />
                    </a>
                    <button 
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-x-2 bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
                    >
                        {isLinkCopied ? <CheckIcon className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                        <span>{isLinkCopied ? 'Link Copied!' : 'Copy Link'}</span>
                    </button>
                </div>
                {userCount !== null && (
                    <div className="mt-6 flex items-center justify-center gap-2 text-gray-500 fade-in">
                        <UsersIcon className="w-5 h-5 text-gray-400" />
                        <p className="text-sm">
                            <span className="font-bold text-gray-600">{userCount.toLocaleString()}</span> homeowners have already explored their opportunities!
                        </p>
                    </div>
                )}
            </div>
        </section>

        <footer className="text-center mt-12 py-4 px-4 slide-up" style={{ animationDelay: '500ms' }}>
            <div className="max-w-4xl mx-auto">
                <img src={footerImage} alt="The Century 21 Aspire Group Real Estate office in Manitowoc, WI" className="w-full h-auto rounded-lg shadow-lg bg-gray-200" />
            </div>
            <p className="text-xs text-gray-500 mt-4 max-w-4xl mx-auto">
                Disclaimer: The information provided by this calculator is for illustrative purposes only and does not constitute financial or legal advice. All figures are estimates. Please consult with a qualified financial advisor, mortgage lender, and real estate professional before making any financial decisions.
            </p>
        </footer>
      </div>
    </div>
  );
};

export default App;