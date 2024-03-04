import { Result } from "./result";

const parseNumber = (input: string): Result<number> => {
  try {
    const value = Number(input);
    if (isNaN(value)) {
      throw new Error("Invalid number");
    }
    return { success: true, value };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error };
    } else {
      return { success: false, error: new Error("An unknown error occurred") };
    }
  }
};

const parseJson = (input: string): Result<unknown> => {
  try {
    const value = JSON.parse(input);
    return { success: true, value };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error };
    } else {
      return { success: false, error: new Error("An unknown error occurred") };
    }
  }
};

const forceParseNumber = (input: string): number => {
  if (input === "") return 0;
  const parsed = parseNumber(input.replace(/[^0-9]/g, ""));
  if (parsed.success) {
    return parsed.value;
  } else {
    return 0;
  }
};

const safeParse = {
  number: parseNumber,
  json: parseJson,
};

const forceParse = {
  number: forceParseNumber,
};

export { forceParse, safeParse };
