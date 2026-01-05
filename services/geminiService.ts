
import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
};

export const getMarketInsight = async (newHomePrice: number, newMonthlyPayment: number): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const formattedNewHomePrice = formatCurrency(newHomePrice);
    const formattedNewMonthlyPayment = formatCurrency(newMonthlyPayment);

    const prompt = `You are a helpful real estate assistant for an agent in Manitowoc, Wisconsin. A client is considering upgrading their home.

Their desired new home price is ${formattedNewHomePrice}.
Their estimated new total monthly housing payment (principal, interest, taxes, and insurance) would be ${formattedNewMonthlyPayment}.

Please provide a brief, optimistic, and encouraging analysis (2-3 short paragraphs) for this client. Touch upon the benefits of homeownership and investing in a new property. Mention the local context of Manitowoc, WI in a positive light if possible, but keep it general. Do not give financial advice. Frame the new monthly payment as an investment in their future. Respond in markdown format.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error fetching market insight:", error);
    throw new Error("An error occurred while fetching market insights.");
  }
};

export const getHouseImage = async (newHomePrice: number): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const formattedNewHomePrice = formatCurrency(newHomePrice);
    const prompt = `A beautiful, modern single-family home in Manitowoc County, Wisconsin. The exterior of a house that would sell for around ${formattedNewHomePrice}. The photo is taken on a sunny day, showcasing the property's curb appeal. Professional real estate photography style.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64ImageBytes: string = part.inlineData.data;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
    }
    
    throw new Error("No image data found in response.");

  } catch (error) {
    console.error("Error generating house image:", error);
    throw new Error("An error occurred while generating the house image.");
  }
};

export const getEstimatedHomeValue = async (address: string): Promise<number> => {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Act as an expert real estate Automated Valuation Model (AVM). Use Google Search to find recent comparable sales, market trends, and public data for the property at: ${address}. Provide a concise estimated market value. IMPORTANT: Respond *only* with the numerical dollar value, without any text, commas, or symbols (e.g., 525000). If you cannot determine a value, respond with '0'.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          tools: [{googleSearch: {}}],
        },
      });

      const textValue = response.text.trim();
      const numericString = textValue.replace(/[^0-9.]/g, '');
      const estimatedValue = parseFloat(numericString);
      
      if (isNaN(estimatedValue) || estimatedValue <= 0) {
        console.error(`Attempt ${attempt}: Failed to parse a valid estimated value from response:`, textValue);
        throw new Error("Invalid number format from AI for home value.");
      }
      
      return estimatedValue; // Success!

    } catch (error) {
      console.error(`Error fetching estimated home value (Attempt ${attempt}/${MAX_RETRIES}):`, error);
      if (attempt === MAX_RETRIES) {
        throw new Error("An error occurred while estimating the home value after multiple attempts.");
      }
      await new Promise(res => setTimeout(res, 1000)); // Wait 1 second before retrying
    }
  }
  // This should be unreachable, but it's a fallback.
  throw new Error("An error occurred while estimating the home value.");
};
