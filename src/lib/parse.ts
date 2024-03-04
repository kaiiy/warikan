import { Result } from "./result";
import { KeishaArray, KeishaArraySchema, KeishaArrayString } from "./type";
import { safeParse as vSafeParse } from "valibot";
import lzSting from "lz-string";
const { decompressFromBase64, compressToBase64 } = lzSting;

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

const parseKeishaArrayFromString = (input: string): Result<KeishaArray> => {
  const decompressed = decompressFromBase64(input.trim());
  if (decompressed === null) {
    return { success: false, error: new Error("Invalid input") };
  }

  const jsonResult = safeParse.json(decompressed);
  if (!jsonResult.success) return { success: false, error: jsonResult.error };

  const newKeishaArrayResult = vSafeParse(
    KeishaArraySchema,
    jsonResult.value,
  );
  if (!newKeishaArrayResult.success) {
    return {
      success: false,
      error: new Error(
        newKeishaArrayResult.issues.map((i) => new Error(i.message)).reduce(
          (a, b) => a + b.message,
          "\n",
        ),
      ),
    };
  }

  return { success: true, value: newKeishaArrayResult.output };
};

const parseKeishaArrayFromKAS = (input: KeishaArrayString) => {
  const newKeishaArray = [...input].map((k) => {
    const numResult = safeParse.number(k.keisha);
    if (!numResult.success) {
      return {
        name: k.name,
        keisha: 0,
      };
    }

    return {
      name: k.name,
      keisha: numResult.value,
    };
  });
  return newKeishaArray;
};

const parseKeishaString = (input: KeishaArray): string => {
  const filtered = input.filter((k) => k.name !== "" && k.keisha !== 0);
  const compressed = compressToBase64(JSON.stringify(filtered));
  return compressed;
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
  keishaArrayFromStr: parseKeishaArrayFromString,
  keishaString: parseKeishaString,
  keishaArrayFromKAS: parseKeishaArrayFromKAS,
};

const forceParse = {
  number: forceParseNumber,
};

export { forceParse, safeParse };
