
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_INSTRUCTION, FOOD_DIAGNOSIS_INSTRUCTION } from "./constants.tsx";
import { AppState } from "./types.ts";
import { calculateBMI, calculateBMR, heightToCm } from "./utils/calculations.ts";

export const getChatResponse = async (userMessage: string, state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const today = new Date().toISOString().split('T')[0];
  const todayLog = state.logs.find(l => l.date === today) || {
    date: today, food: [], exercise: [], hydration: 0, sleepHours: 0, sedentaryHours: 0
  };

  const bmi = calculateBMI(state.user.weight, state.user.heightFeet, state.user.heightInches);
  const bmr = calculateBMR(state.user); 
  const heightCm = heightToCm(state.user.heightFeet, state.user.heightInches);

  const contextPrompt = `
    USER: ${state.user.name}, ${state.user.age}y, ${state.user.weight}kg, Goal: ${state.user.goal}
    STATS: BMI ${bmi}, BMR ${bmr}
    LOGS: ${todayLog.food.length} items eaten today.
    QUERY: ${userMessage}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contextPrompt,
      config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.7 },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to AI Coach.";
  }
};

export const getFoodDiagnosis = async (foodName: string, state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const bmr = calculateBMR(state.user);
  
  const prompt = `
    Diagnose this food: "${foodName}"
    User Profile: ${state.user.goal} goal, ${state.user.weight}kg.
    BMR: ${bmr} kcal.
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

    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Diagnosis Error:", error);
    return null;
  }
};
