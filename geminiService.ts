
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, FOOD_DIAGNOSIS_INSTRUCTION } from "./constants";
import { AppState } from "./types";
import { calculateBMI, calculateBMR } from "./utils/calculations";

export const getChatResponse = async (userMessage: string, state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];
  const todayLog = state.logs.find(l => l.date === today) || {
    date: today, food: [], exercise: [], hydration: 0, sleepHours: 0, sedentaryHours: 0
  };

  const bmi = calculateBMI(state.user.weight, state.user.heightFeet, state.user.heightInches);
  const bmr = calculateBMR(state.user);

  const contextPrompt = `
    USER DATA:
    Name: ${state.user.name}, Age: ${state.user.age}, Weight: ${state.user.weight}kg, Goal: ${state.user.goal}
    BMI: ${bmi}, BMR: ${bmr}
    TODAY'S LOGS:
    Food: ${JSON.stringify(todayLog.food)}
    Exercise: ${JSON.stringify(todayLog.exercise)}
    Hydration: ${todayLog.hydration}ml
    
    USER QUERY: ${userMessage}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contextPrompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my knowledge base. Please try again.";
  }
};

export const getFoodDiagnosis = async (foodName: string, state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const bmr = calculateBMR(state.user);
  
  const prompt = `
    Diagnose: "${foodName}"
    User Goal: ${state.user.goal}
    User Weight: ${state.user.weight}kg
    User BMR: ${bmr}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: FOOD_DIAGNOSIS_INSTRUCTION,
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Diagnosis Error:", error);
    return null;
  }
};
