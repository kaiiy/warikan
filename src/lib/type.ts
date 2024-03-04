import { array, number, object, Output, string } from "valibot";

export interface Amount {
  // 名前
  name?: string;
  // 金額
  amount: number;
  // 人数
  count: number;
  // 傾斜
  keisha?: number;
}

export type Operate = "add" | "sub";

const KeishaSchema = object({
  name: string(),
  keisha: number(),
});
export const KeishaArraySchema = array(KeishaSchema);
export type KeishaArray = Output<typeof KeishaArraySchema>;

export interface KeishaString {
  name: string;
  keisha: string;
}

export type KeishaArrayString = KeishaString[];
