import { useEffect, useState } from "react";
import { Check, JapaneseYen, Minus, Plus, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { array, number, object, parse, string } from "valibot";
import lzSting from "lz-string";

const { decompressFromBase64 } = lzSting;

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

// 傾斜 (lz-stringからパース)
// interface KeishaProps {
//   name: string;
//   amount: number;
// }
const KeishaSchema = object({
  name: string(),
  keisha: number(),
});
const KeishaArraySchema = array(KeishaSchema);

const toNumber = (value: string) => {
  return Number(value.replace(/[^0-9]/g, ""));
};

type operate = "add" | "sub";

const App = () => {
  // 支払い合計金額
  const [totalAmount, setTotalAmount] = useState(0);
  // 参加者の料金
  const [amounts, setAmounts] = useState<Amount[]>(
    Array.from(
      { length: 12 },
      () => ({ amount: 0, count: 0 }),
    ),
  );
  // 最小金額
  const [minAmount, setMinAmount] = useState(1000);

  useEffect(() => {
    const newAmounts = [...amounts];
    newAmounts[0].count = 1;
    setAmounts(newAmounts);
  }, []);

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

  const [maybeKeishaText, setMaybeKeishaText] = useState("");
  // 傾斜を読み込む (lz-stringからパース)
  const loadKeisha = () => {
    const decompressed = decompressFromBase64(maybeKeishaText.trim());
    if (decompressed === null) return;

    try {
      const json = JSON.parse(decompressed);
      const keisha = parse(KeishaArraySchema, json);
      const newAmounts = [...amounts];
      if (keisha.length > newAmounts.length) return;

      for (let i = 0; i < keisha.length; i++) {
        newAmounts[i].name = keisha[i].name;
        newAmounts[i].keisha = keisha[i].keisha;
      }
      setAmounts(newAmounts);
    } catch (e) {
    }
  };

  // 傾斜が存在するか
  const existKeisha = () => {
    let flag = true;
    for (let i = 0; i < amounts.length; i++) {
      if (amounts[i].count >= 1 && amounts[i].keisha === undefined) {
        flag = false;
        break;
      }
    }
    return flag;
  };

  // 割り勘計算
  const warikan = () => {
    // 傾斜なし
    if (!existKeisha()) {
      const totalCount = amounts.reduce((acc, cur) => acc + cur.count, 0);
      const perAmount = Math.floor(totalAmount / totalCount / minAmount);
      const newAmounts = [...amounts];
      for (let i = 0; i < newAmounts.length; i++) {
        if (newAmounts[i].count === 0) continue;
        newAmounts[i].amount = perAmount * minAmount;
      }
      setAmounts(newAmounts);
    }
    // 傾斜あり
    let totalKeisha = 0;
    for (let i = 0; i < amounts.length; i++) {
      if (amounts[i].count <= 0) continue;
      const keisha = amounts[i].keisha;
      if (keisha === undefined) continue;
      totalKeisha += keisha * amounts[i].count;
    }
    const newAmounts = [...amounts];
    for (let i = 0; i < newAmounts.length; i++) {
      if (newAmounts[i].count === 0) continue;
      newAmounts[i].amount = Math.floor(
        totalAmount * (newAmounts[i].keisha || 0) /
          totalKeisha / minAmount,
      ) * minAmount;
    }
    setAmounts(newAmounts);
  };

  return (
    <div className="flex justify-center">
      <Card className="w-full md:w-1/2">
        <CardHeader>
          <CardTitle>Warikan Calculator</CardTitle>
          <CardDescription>
            適切な支払い金額を計算しましょう
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* 支払い合計金額入力  */}
          <div>
            <p className="text-sm font-medium mb-1">合計金額</p>
            <div className="flex space-x-2 items-center">
              <JapaneseYen />
              <Input
                type="text"
                value={totalAmount}
                className="text-lg font-medium flex-1"
                onChange={(e) => setTotalAmount(toNumber(e.target.value))}
              />
              <p className="text-lg font-medium">円</p>
            </div>
          </div>
          {/* 端数 */}
          <div>
            <p className="text-sm font-medium mb-2">端数金額</p>
            <div className="flex space-x-2 items-center">
              <JapaneseYen className="mr-3" />
              <p className="text-lg font-medium flex-1">
                {(totalAmount -
                  amounts.reduce((acc, cur) => acc + cur.amount * cur.count, 0))
                  .toLocaleString()}
              </p>
              <p className="text-lg font-medium">円</p>
            </div>
          </div>
          {/* 最小単位金額 */}
          <div>
            <p className="text-sm font-medium mb-1">最小単位金額</p>
            <div className="flex space-x-2 items-center">
              <JapaneseYen />
              <Input
                type="text"
                value={minAmount}
                className="text-lg font-medium flex-1"
                onChange={(e) => setMinAmount(toNumber(e.target.value))}
              />
              <p className="text-lg font-medium">円</p>
            </div>
          </div>
          {/* 割り勘 */}
          <Button className="w-full" onClick={() => warikan()}>
            <Check className="mr-2 h-4 w-4" /> Warikan!!
          </Button>
          {/* 参加者の料金 */}
          {amounts.map((amount, index) => (
            <div key={index}>
              {/* 名前の表示  */}
              {amount.name && (
                <p className="text-md mb-0 font-medium ">
                  | {amount.name} ({amount.keisha})
                </p>
              )}
              <div className="flex items-center space-x-2 rounded-md border py-4 px-4">
                {/* 人数  */}
                <div className="space-x-1">
                  <UserRound className="h-6 w-6" />

                  <div>x{amount.count}</div>
                </div>

                {/* 人数増減  */}
                <div className="flex space-x-2 flex-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => updateCount(index, "sub")}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => updateCount(index, "add")}
                  >
                    <Plus className="h-4 w-4" />
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
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    onClick={() => updateAmount(index, "add")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <div className="w-full">
            <Textarea
              className="mb-2"
              onChange={(e) => setMaybeKeishaText(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => loadKeisha()}
            >
              <Check className="mr-2 h-4 w-4" /> Load Keisha!!
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default App;
