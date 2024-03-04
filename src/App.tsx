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
import { array, number, object, Output, parse, string } from "valibot";
import lzSting from "lz-string";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
type Keisha = Output<typeof KeishaSchema>;
interface KeishaString {
  name: string;
  keisha: string;
}

const toNumber = (value: string) => {
  return Number(value.replace(/[^0-9]/g, ""));
};

const toSafeNumber = (value: string) => {
  try {
    return Number(value);
  } catch (e) {
    return 0;
  }
};

type operate = "add" | "sub";

const App = () => {
  // 人数
  const numPeople = 12;
  // 支払い合計金額
  const [totalAmount, setTotalAmount] = useState(0);
  // 参加者の料金
  const [amounts, setAmounts] = useState<Amount[]>(
    Array.from(
      { length: numPeople },
      () => ({ amount: 0, count: 0 }),
    ),
  );
  // 最小金額
  const [minAmount, setMinAmount] = useState(1000);

  const initAmounts = () => {
    const newAmounts = [...amounts];
    for (let i = 0; i < newAmounts.length; i++) {
      newAmounts[i].amount = 0;
      newAmounts[i].count = 0;
    }
    newAmounts[0].count = 1;
    setAmounts(newAmounts);
  };

  useEffect(() => {
    initAmounts();
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
      const _keisha = parse(KeishaArraySchema, json);

      initAmounts();
      const newAmounts = [...amounts];
      const newKeisha = [...keisha];
      if (_keisha.length > newAmounts.length) return;
      if (_keisha.length > newKeisha.length) return;

      for (let i = 0; i < _keisha.length; i++) {
        newAmounts[i].name = _keisha[i].name;
        newAmounts[i].keisha = _keisha[i].keisha;
        newAmounts[i].count = 1;

        newKeisha[i].name = _keisha[i].name;
        newKeisha[i].keisha = _keisha[i].keisha.toString();
      }
      setAmounts(newAmounts);
      setKeisha(newKeisha);
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
    } else {
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
    }
  };

  const [keisha, setKeisha] = useState<KeishaString[]>(Array.from(
    { length: numPeople },
    () => ({ name: "", keisha: "" }),
  ));
  const setName = (index: number, name: string) => {
    const newKeisha = [...keisha];
    newKeisha[index].name = name;
    setKeisha(newKeisha);
  };
  const setKeishaValue = (index: number, value: string) => {
    const newKeisha = [...keisha];
    newKeisha[index].keisha = value;
    setKeisha(newKeisha);
  };
  const calcKeishaLzSting = () => {
    const newKeisha: Keisha[] = [...keisha].map((k) => {
      return {
        name: k.name,
        keisha: toSafeNumber(k.keisha),
      };
    });
    const filtered = newKeisha.filter((k) => k.name !== "" && k.keisha !== 0);
    const compressed = compressToBase64(JSON.stringify(filtered));
    setMaybeKeishaText(compressed);
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
                    value={totalAmount}
                    className="flex-1 text-lg font-medium"
                    onChange={(e) => setTotalAmount(toNumber(e.target.value))}
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
                    value={minAmount}
                    className="flex-1 text-lg font-medium"
                    onChange={(e) => setMinAmount(toNumber(e.target.value))}
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
                  {keisha.map((k, index) => (
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
                          setKeishaValue(index, e.target.value)}
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
