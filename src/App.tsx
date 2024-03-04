import { useEffect, useState } from "react";
import { Check, JapaneseYen, Minus, Plus, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  array,
  number,
  object,
  safeParse as vSafeParse,
  string,
} from "valibot";
import lzSting from "lz-string";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { forceParse, safeParse } from "@/lib/parse";

const { decompressFromBase64, compressToBase64 } = lzSting;

interface Amount {
  // 名前
  name?: string;
  // 金額
  amount: number;
  // 人数
  count: number;
  // 傾斜
  keisha?: number;
}

const KeishaSchema = object({
  name: string(),
  keisha: number(),
});
const KeishaArraySchema = array(KeishaSchema);
interface KeishaString {
  name: string;
  keisha: string;
}

type operate = "add" | "sub";

// 人数
const NUM_PEOPLE = 12;

const App = () => {
  // 支払い合計金額
  const [totalAmount, setTotalAmount] = useState(0);
  // 参加者の料金
  const [amounts, setAmounts] = useState<Amount[]>(
    Array.from({ length: NUM_PEOPLE }, () => ({ amount: 0, count: 0 })),
  );
  // 最小金額
  const [minAmount, setMinAmount] = useState(1000);
  // 数値バリデーション前 傾斜列 (入力そのまま)
  const [keishaArrayString, setKeishaArrayString] = useState<KeishaString[]>(
    Array.from(
      { length: NUM_PEOPLE },
      () => ({ name: "", keisha: "" }),
    ),
  );

  // 個別料金の初期化
  const initAmounts = () => {
    const newAmounts = Array.from(
      { length: NUM_PEOPLE },
      () => ({ amount: 0, count: 0 }),
    );
    newAmounts[0].count = 1;
    setAmounts(newAmounts);
  };

  // 人数更新
  const updateCount = (index: number, operate: operate) => {
    const newAmounts = [...amounts];
    const currentAmount = newAmounts[index];
    if (operate === "add") {
      currentAmount.count++;
    } else {
      if (currentAmount.count === 0) return;
      currentAmount.count--;
    }
    setAmounts(newAmounts);
  };

  // 個別料金更新
  const updateAmount = (index: number, operate: operate) => {
    const newAmounts = [...amounts];
    const currentAmount = newAmounts[index];
    if (operate === "add") {
      currentAmount.amount += minAmount;
    } else {
      if (currentAmount.amount - minAmount < 0) return;
      currentAmount.amount -= minAmount;
    }
    setAmounts(newAmounts);
  };

  // 傾斜文字列
  const [maybeKeishaText, setMaybeKeishaText] = useState("");

  // 傾斜を読み込む (lz-stringからパース)
  const loadKeisha = () => {
    // 傾斜文字列読み込み: 始め
    const decompressed = decompressFromBase64(maybeKeishaText.trim());
    if (decompressed === null) return;

    const jsonResult = safeParse.json(decompressed);
    if (!jsonResult.success) return;

    const _keishaResult = vSafeParse(KeishaArraySchema, jsonResult.value);
    if (!_keishaResult.success) return;

    const newKeishaArray = _keishaResult.output;
    if (
      newKeishaArray.length > NUM_PEOPLE
    ) return;
    // 傾斜文字列読み込み: 終わり

    // warikan計算始めから
    initAmounts();

    const newAmounts = [...amounts];
    const newKeishaArrayString = [...keishaArrayString];

    for (let i = 0; i < newKeishaArray.length; i++) {
      newAmounts[i].name = newKeishaArray[i].name;
      newAmounts[i].keisha = newKeishaArray[i].keisha;
      newAmounts[i].count = 1;

      newKeishaArrayString[i].name = newKeishaArray[i].name;
      newKeishaArrayString[i].keisha = newKeishaArray[i].keisha.toString();
    }

    setAmounts(newAmounts);
    setKeishaArrayString(newKeishaArrayString);
  };

  // 傾斜が存在するか
  const existKeisha = () =>
    amounts.every((amount) =>
      !(amount.count >= 1 && amount.keisha === undefined)
    );

  // 割り勘計算 (ボタンクリック時)
  const warikan = () => {
    // 傾斜なし
    if (!existKeisha()) {
      const totalCount = amounts.reduce((acc, cur) => acc + cur.count, 0);
      const perAmount = Math.floor(totalAmount / totalCount / minAmount) *
        minAmount;
      const newAmounts = amounts.map((amount) => ({
        ...amount,
        amount: amount.count === 0 ? 0 : perAmount,
      }));
      setAmounts(newAmounts);
    } else {
      // 傾斜あり
      const totalKeisha = amounts.reduce((acc, cur) => {
        return cur.count > 0 && cur.keisha !== undefined
          ? acc + (cur.keisha * cur.count)
          : acc;
      }, 0);
      const newAmounts = amounts.map((amount) => {
        if (amount.count === 0) {
          return { ...amount, amount: 0 };
        }
        const amountValue = Math.floor(
          totalAmount * (amount.keisha || 0) / totalKeisha / minAmount,
        ) * minAmount;
        return { ...amount, amount: amountValue };
      });
      setAmounts(newAmounts);
    }
  };

  const setName = (index: number, name: string) => {
    const newKeisha = [...keishaArrayString];
    newKeisha[index].name = name;
    setKeishaArrayString(newKeisha);
  };
  const setKeishaArrayStringValue = (index: number, value: string) => {
    const newKeisha = [...keishaArrayString];
    newKeisha[index].keisha = value;
    setKeishaArrayString(newKeisha);
  };
  const calcKeishaLzSting = () => {
    const newKeishaArray = [...keishaArrayString].map((k) => {
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
    const filtered = newKeishaArray.filter((k) =>
      k.name !== "" && k.keisha !== 0
    );
    const compressed = compressToBase64(JSON.stringify(filtered));
    setMaybeKeishaText(compressed);
  };

  // 初回画面描画時に初期化
  useEffect(() => {
    initAmounts();
  }, []);

  return (
    <div className="flex justify-center">
      <Card className="w-full md:w-1/2">
        <CardHeader>
          <CardTitle>Warikan Calculator</CardTitle>
          <CardDescription>
            適切な支払い金額を計算しましょう
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="warikan">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="warikan">Warikan</TabsTrigger>
              <TabsTrigger value="keisha">Keisha</TabsTrigger>
            </TabsList>

            <TabsContent value="warikan" className="grid gap-4">
              {/* 支払い合計金額入力  */}
              <div className="pt-2">
                <p className="mb-1 text-sm font-medium">合計金額</p>
                <div className="flex items-center space-x-2">
                  <JapaneseYen />
                  <Input
                    type="text"
                    value={totalAmount === 0
                      ? ""
                      : totalAmount.toLocaleString()}
                    className="flex-1 text-lg font-medium"
                    onChange={(e) =>
                      setTotalAmount(forceParse.number(e.target.value))}
                  />
                  <p className="text-lg font-medium">円</p>
                </div>
              </div>
              {/* 端数 */}
              <div>
                <p className="mb-2 text-sm font-medium">端数金額</p>
                <div className="flex items-center space-x-2">
                  <JapaneseYen className="mr-3" />
                  <p className="flex-1 text-lg font-medium">
                    {(totalAmount -
                      amounts.reduce(
                        (acc, cur) => acc + cur.amount * cur.count,
                        0,
                      ))
                      .toLocaleString()}
                  </p>
                  <p className="text-lg font-medium">円</p>
                </div>
              </div>
              {/* 最小単位金額 */}
              <div>
                <p className="mb-1 text-sm font-medium">最小単位金額</p>
                <div className="flex items-center space-x-2">
                  <JapaneseYen />
                  <Input
                    type="text"
                    value={minAmount === 0 ? "" : minAmount.toLocaleString()}
                    className="flex-1 text-lg font-medium"
                    onChange={(e) =>
                      setMinAmount(forceParse.number(e.target.value))}
                  />
                  <p className="text-lg font-medium">円</p>
                </div>
              </div>
              {/* 割り勘 */}
              <Button className="w-full" onClick={() => warikan()}>
                <Check className="mr-2 size-4" /> Warikan!!
              </Button>
              {/* 参加者の料金 */}
              {amounts.map((amount, index) => (
                <div key={index}>
                  {/* 名前の表示  */}
                  {(amount.name && amount.keisha) && (
                    <p className="text-md mb-0 font-medium">
                      | {amount.name} ({amount.keisha})
                    </p>
                  )}
                  <div className="flex items-center space-x-2 rounded-md border p-4">
                    {/* 人数  */}
                    <div className="space-x-1">
                      <UserRound className="size-6" />

                      <div>x{amount.count}</div>
                    </div>

                    {/* 人数増減  */}
                    <div className="flex flex-1 space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => updateCount(index, "sub")}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => updateCount(index, "add")}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>

                    {/* 金額  */}
                    <p className="text-lg font-medium leading-none">
                      {amount.amount.toLocaleString()} 円
                    </p>

                    {/* 金額増減  */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => updateAmount(index, "sub")}
                      >
                        <Minus className="size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-full"
                        onClick={() => updateAmount(index, "add")}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="keisha">
              <div className="mb-4 mt-0">
                <p className="mb-1 text-sm font-medium">傾斜設定</p>
                <Textarea
                  className="mb-2"
                  value={maybeKeishaText}
                  placeholder="傾斜文字列を入力してください"
                  onChange={(e) => setMaybeKeishaText(e.target.value)}
                />
                <Button
                  className="w-full"
                  onClick={() => loadKeisha()}
                >
                  <Check className="mr-2 size-4" /> Load Keisha!!
                </Button>
              </div>
              <Separator className="mb-4" />
              <div>
                <p className="mb-2 text-sm font-medium">傾斜文字列計算</p>

                <div className="mb-4 grid gap-4">
                  {keishaArrayString.map((k, index) => (
                    <div key={index} className="flex space-x-2">
                      <Input
                        type="text"
                        value={k.name}
                        placeholder="名前"
                        className="text-sm"
                        onChange={(e) =>
                          setName(index, e.target.value)}
                      />
                      <Input
                        type="text"
                        value={k.keisha ? k.keisha : ""}
                        placeholder="傾斜率"
                        className="text-sm"
                        onChange={(e) =>
                          setKeishaArrayStringValue(index, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => calcKeishaLzSting()}
                >
                  <Check className="mr-2 size-4" />Calculate Keisha!!
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default App;
