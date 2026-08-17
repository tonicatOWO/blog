---
title: Rustlings 前 16 題學習心得與重點解析
description: >-
  這一階段的 Rustlings 練習，主要涵蓋了 Variables、Functions、If、Primitive
  Types、Array、Slice、Tuple 等 Rust
  基礎。從實際解題過程來看，我已經可以看懂大部分基本程式結構，也能根據錯誤訊息進行修改。這次練習讓我開始理解 Rust
  的設計邏輯：型別、作用域、expression、資料結構，以及一段程式碼到底產生什麼值、這個值是什麼型別。
pubDate: 2026-08-17T00:00:00.000Z
heroImage: ../../assets/learning-rust-with-Rustlings.png
---

# 一、Rust 函式的回傳值與 expression

一開始在 `functions5` 中，我使用：

```rust
fn square(num: i32) -> i32 {
    return num * num;
}
```

這其實是合法的 Rust，但是 Clippy 提醒：

```text
warning: unneeded `return` statement
```

Rust 更推薦：

```rust
fn square(num: i32) -> i32 {
    num * num
}
```

Rust 函式最後一個沒有分號的 expression，可以直接成為函式的回傳值。

因此：

```rust
num * num
```

會產生一個 `i32`，而函式宣告：

```rust
-> i32
```

剛好要求回傳 `i32`。

但如果寫：

```rust
num * num;
```

最後多了一個分號，意思就不同了。

有分號時，它會變成 statement，不再把計算結果當成函式最後的值。

可以記成：

```text
expression     → 有值
expression;    → 執行它，但不把結果當最後的值
```

這也是 Rust 和一些其他語言很不一樣的地方。

---

# 二、`if` 不只是流程控制，本身也是 expression

在 `bigger(a, b)` 題目裡，我原本寫：

```rust
if (&a > &b) {
    a
} else {
    b
}
```

問題是我把 `&` 放到了錯誤的位置。

因為：

```rust
a: i32
b: i32
```

兩個本身都是整數，所以直接：

```rust
a > b
```

即可。

正確寫法：

```rust
fn bigger(a: i32, b: i32) -> i32 {
    if a > b {
        a
    } else {
        b
    }
}
```

`if` 這整段會產生一個值：

```rust
if a > b {
    a
} else {
    b
}
```

因此甚至可以想成：

```text
if 條件成立 → 整個 expression 的值是 a
否則       → 整個 expression 的值是 b
```

所以函式不用寫：

```rust
return a;
```

而是直接靠 `if` expression 的結果回傳。

---

# 三、`if / else` 的所有分支型別必須相容

這是目前碰到最多次的規則。

例如：

```rust
fn picky_eater(food: &str) -> &str {
    if food == "strawberry" {
        "Yummy!"
    } else {
        1
    }
}
```

這會出錯。

原因是：

```rust
"Yummy!"   // &str
1          // integer
```

兩個 branch 的型別不一樣。

Rust 必須在編譯時確定整個：

```rust
if ... {
} else {
}
```

究竟會產生什麼型別。

因此應該寫：

```rust
fn picky_eater(food: &str) -> &str {
    if food == "strawberry" {
        "Yummy!"
    } else if food == "potato" {
        "I guess I can eat that."
    } else {
        "No thanks!"
    }
}
```

三個分支全部都是：

```rust
&str
```

所以編譯器能確定整個 `if` expression 的型別。

## animal_habitat 題目的相同問題

例如：

```rust
let identifier = if animal == "crab" {
    1
} else if animal == "gopher" {
    2
} else if animal == "snake" {
    3
} else {
    "Unknown"
};
```

問題也是：

```text
1、2、3       → integer
"Unknown"     → &str
```

所以最後可以改成：

```rust
else {
    0
}
```

變成：

```rust
let identifier = if animal == "crab" {
    1
} else if animal == "gopher" {
    2
} else if animal == "snake" {
    3
} else {
    0
};
```

這樣整個 `identifier` 就一定是整數。

> 要同時想：這段程式會不會跑、這整段 expression 最後產生哪一種型別。

---

# 四、函式的作用域 Scope

Quiz 1 我犯了一個錯誤。

我一開始寫成：

```rust
fn main() {
    fn calculate_price_of_apples(n: i32) -> i32 {
        ...
    }
}
```

結果測試出現：

```text
cannot find function `calculate_price_of_apples` in this scope
```

原因是函式被寫在 `main()` 的 scope 裡。

下面的：

```rust
mod tests {
    use super::*;
}
```

找不到它。

因此應該把函式放到外層：

```rust
fn calculate_price_of_apples(n: i32) -> i32 {
    if n > 40 {
        n
    } else {
        n * 2
    }
}

fn main() {
}
```

外層的 scope 結構是：

```text
外層
├── calculate_price_of_apples()
├── main()
└── tests
```

三者才能互相依照 module / scope 規則存取。

如果寫成：

```text
main
└── calculate_price_of_apples
```

那 `tests` 就不能直接看到它。

---

# 五、`^` 並不是平方

Quiz 1 還讓我踩到另一個很典型的坑。

我原本寫：

```rust
n ^ 2
```

我直覺把 `^` 當成平方，但 Rust 中：

```rust
^
```

代表的是：

> bitwise XOR，位元異或

不是 exponent。

所以：

```rust
n ^ 2
```

並不是：

```text
n²
```

而題目真正需要的是每顆兩元：

```rust
n * 2
```

這個差異值得記住。

---

# 六、`""` 和 `''` 完全不同

這是 Rust 基礎型別裡很重要的區分。

## 雙引號

```rust
"hello"
```

代表字串，通常是：

```rust
&str
```

例如：

```rust
let name = "Hao";
```

---

## 單引號

```rust
'H'
```

代表：

```rust
char
```

也就是單一 Unicode 字元。

例如：

```rust
let grade = 'A';
let crab = '🦀';
```

都可以。

但是：

```rust
'hello'
```

不行，因為 `char` 只能是一個字元。

目前可以簡單記：

```text
"hello" → &str
'H'     → char
```

補充：`'a` 是 lifetime，不是 char。

---

# 七、Array 的 `[值; 數量]`

在 array 題目中，我一開始用一大串：

```rust
let a = "aaaaaaaaaaaaaaaa...";
```

雖然 `.len()` 可以使用，但這不是 array，而是：

```rust
&str
```

題目真正要求的是 array。

Rust 可以很方便地使用：

```rust
let a = [0; 100];
```

意思不是：

```text
[0, 100]
```

而是：

> 建立 100 個 `0`

也就是：

```text
[0, 0, 0, 0, ...]
```

共 100 個。

---

## `;` 和 `,` 在 array 中的差別

這點我特別詢問過，也很容易混淆。

```rust
[0; 100]
```

表示：

```text
0 重複 100 次
```

但：

```rust
[0, 100]
```

表示：

```text
兩個元素：
0
100
```

所以：

```rust
let a = [0, 100];

a.len()
```

結果是：

```text
2
```

不是 100。

因此可以記成：

```text
[value; count]      → 重複
[value1, value2]    → 列舉元素
```

例如：

```rust
[5; 3]
```

等於：

```rust
[5, 5, 5]
```

而：

```rust
[5, 3]
```

就是：

```rust
[5, 3]
```

兩個元素。

---

# 八、Array 和 Slice 是不同概念

這次 `primitive_types4` 讓我開始用 slice。

給定：

```rust
let a = [1, 2, 3, 4, 5];
```

要取得：

```text
[2, 3, 4]
```

正確方式：

```rust
let nice_slice = &a[1..4];
```

這裡：

```rust
1..4
```

意思是：

```text
包含 index 1
不包含 index 4
```

所以：

```text
index:   0  1  2  3  4
value:  [1, 2, 3, 4, 5]
            └──────┘
```

取得：

```text
[2, 3, 4]
```

---

## Array

例如：

```rust
[i32; 5]
```

代表：

> 固定長度五個 `i32`

---

## Slice

例如：

```rust
&[i32]
```

代表：

> 借用某段連續資料

因此：

```rust
&a[1..4]
```

並不是重新建立：

```rust
[2, 3, 4]
```

而是取得原本 `a` 中一部分的 view / reference。

```text
Array = 真正擁有一整組固定長度資料
Slice = 看向其中一段資料
```

這個觀念進入 borrowing 時會用到。

---

# 九、Tuple 與 destructuring

我一開始習慣直接透過：

```rust
cat.0
cat.1
```

取得 tuple 元素。

例如：

```rust
let cat = ("furry mcfurson", 3.5);

let name = cat.0;
let age = cat.1;
```

這完全合法。

但是 `primitive_types5` 的真正學習目標是：

> tuple destructuring

因此更符合題意的寫法：

```rust
let (name, age) = cat;
```

如果：

```rust
cat = ("furry mcfurson", 3.5)
```

就可以理解為：

```text
("furry mcfurson", 3.5)
        ↓             ↓
      name           age
```

因此：

```rust
let (name, age) = cat;
```

一次把 tuple 拆成兩個變數。

我第一次用到 Rust 的 pattern matching / destructuring 概念。

雖然目前只是：

```rust
(name, age)
```

但之後 struct、enum、match 應該都會大量使用這種模式。

---

# 十、Tuple indexing 的語法

Tuple 不能用：

```rust
cat::
```

來取資料。

真正方式是：

```rust
cat.0
cat.1
```

例如：

```rust
let numbers = (10, 20, 30);

numbers.0 // 10
numbers.1 // 20
numbers.2 // 30
```

---

# 十一、`println!` 與 format string

這節也學到 Rust 的 formatted output。

例如：

```rust
let name = "Hao";
let age = 20;

println!("{name} is {age} years old");
```

會輸出：

```text
Hao is 20 years old
```

Rust 可以直接在 format string 裡使用變數名稱：

```rust
{name}
{age}
```

也可以寫成傳統形式：

```rust
println!("{} is {} years old", name, age);
```

目前比較推薦記住新的寫法：

```rust
println!("{name} is {age} years old");
```

因為可讀性非常高。

---

# 十二、Type inference 與顯式型別

這幾題中我常寫：

```rust
let x: i32 = 42;
```

或：

```rust
fn calculate_price_of_apples(n: i32) -> i32
```

而官方答案有時只寫：

```rust
let x = 42;
```

Rust 有 type inference，型別推導。編譯器會根據上下文判斷型別。

例如：

```rust
let x = 42;
```

通常會推成：

```rust
i32
```

因此兩種方式都可以：

```rust
let x: i32 = 42;
```

以及：

```rust
let x = 42;
```

目前我比較習慣顯式寫型別，但之後需要慢慢學會判斷：

> 什麼時候 Rust 已經能很明確推導，就不用把型別全部寫出來。

---

# 十三、Shadowing 是目前需要補強的概念

從前面的解題紀錄來看，`variables5` 雖然可能成功通過編譯，但是我其實沒有真正依照題目想教的方式處理。

Rust 允許重新：

```rust
let number = ...
```

覆蓋前面的同名 binding。

例如：

```rust
let number = "3";
let number: i32 = number.parse().unwrap();
let number = number + 2;
```

這叫：

> Shadowing

它與：

```rust
let mut number
```

不完全相同。

`mut` 是修改同一個 variable 的值。

Shadowing 則是：

> 建立新的同名 binding，遮蔽舊的 binding。

而且可以改變型別。

例如：

```rust
let spaces = "   ";
let spaces = spaces.len();
```

第一個：

```rust
spaces: &str
```

第二個：

```rust
spaces: usize
```

這是 Rust 的特色語法。

shadowing 我之後要回頭重新練。

---

# 十四、Boolean 與 `!`

同樣地，`primitive_types1` 如果只是把兩個 `if` 改成：

```rust
if ... {
} else {
}
```

雖然可能達到相同效果，但會避開題目真正要練的：

```rust
let is_evening = !is_morning;
```

其中：

```rust
!
```

代表 boolean NOT。

例如：

```rust
let a = true;
let b = !a;
```

則：

```text
a = true
b = false
```

因此 `!` 也先記進基礎運算子清單。

---

# 十五、編譯成功不代表真的理解題目

這是這輪 Rustlings 的學習心得。

Rustlings 很多早期題目只檢查：

```text
能不能 compile
tests 有沒有 pass
```

但有些題目可以透過修改其他地方「繞過」真正的學習內容。

例如：

### primitive_types5

題目要學：

```rust
let (name, age) = cat;
```

但是：

```rust
cat.0
cat.1
```

也可能做出正確結果。

程式沒錯，但沒有練到 destructuring。

---

### primitive_types1

題目希望練：

```rust
bool
!
```

但是直接改流程結構可能一樣能通過。

---

### variables5

甚至可能 compile 成功，但實際輸出語意不符合題目。

所以現在我應該建立一個新的解題習慣：

```text
1. 看題目想教什麼
2. 自己先嘗試
3. 看 compiler error
4. 修到能 compile
5. 跑 tests
6. 確認實際輸出
7. 再看官方 solution
8. 比較「我是否真的用了該題想教的概念」
```

而不是只看：

```text
Exercise done ✓
```

就直接下一題。

---

# 十六、開始學會閱讀 Compiler Error 與 Clippy

Rust 的優勢是：

> Compiler 的錯誤訊息非常詳細。

例如：

```text
cannot find function `calculate_price_of_apples` in this scope
```

其實已經直接告訴我：

> 問題不是函式內容，而是現在的 scope 看不到它。

又例如：

```text
warning: unneeded `return` statement
```

代表程式可以跑，但 Rust 提醒：

> 這不是最 idiomatic 的寫法。

所以之後看到：

```text
error
```

和：

```text
warning
```

要分開理解。

### Error

```text
error
```

通常代表：

> 程式不能編譯。

### Warning

```text
warning
```

代表：

> 程式可能能跑，但存在風格、未使用程式碼或潛在問題。

例如：

```text
clippy::needless_return
```

並不是程式壞掉，只是 Clippy 建議把：

```rust
return num * num;
```

改成：

```rust
num * num
```

---

# 十七、目前應該建立的 Rust 心智模型

經過目前這十幾題，我覺得可以把 Rust 基礎先整理成五個核心問題。

每看到一段程式碼，可以問：

## 1. 這是什麼型別？

例如：

```rust
42          // integer
3.5         // floating point
'A'         // char
"Hello"     // &str
true        // bool
[1, 2, 3]   // array
(1, "A")    // tuple
```

---

## 2. 這段 expression 最後產生什麼值？

例如：

```rust
if x > 10 {
    100
} else {
    200
}
```

這整段本身會產生：

```text
100 或 200
```

---

## 3. 有沒有多打一個 `;`？

例如：

```rust
x + 1
```

與：

```rust
x + 1;
```

在函式最後可能有完全不同的效果。

---

## 4. 目前所在的 Scope 能不能看到這個東西？

例如：

```rust
fn main() {
    fn test() {}
}
```

外部 code 不一定可以直接使用 `test()`。

---

## 5. 我現在是建立資料，還是借用資料？

例如：

```rust
[1, 2, 3]
```

是 array。

而：

```rust
&a[1..3]
```

是 slice reference。

這個問題之後進入 ownership / borrowing 會更重要。

---

# 十八、目前必須熟記的語法

目前值得直接熟記的內容可以整理成：

```rust
// Variable
let x = 10;

// Mutable variable
let mut x = 10;
x = 20;

// Function
fn add(a: i32, b: i32) -> i32 {
    a + b
}

// If expression
let bigger = if a > b {
    a
} else {
    b
};

// String slice
let name = "Hao";

// Char
let letter = 'H';

// Array
let a = [1, 2, 3];

// 重複 array
let a = [0; 100];

// Array length
a.len();

// Slice
let s = &a[1..3];

// Tuple
let cat = ("Tom", 3.5);

// Tuple indexing
cat.0;
cat.1;

// Tuple destructuring
let (name, age) = cat;

// Format output
println!("{name} is {age} years old");
```

---

# 十九、最容易混淆的符號整理

| 語法         | 意思                               |
| ---------- | -------------------------------- |
| `"A"`      | `&str` 字串                        |
| `'A'`      | `char` 字元                        |
| `&x`       | reference / borrow               |
| `!x`       | Boolean NOT 等用途                  |
| `a > b`    | 大於比較                             |
| `a * b`    | 乘法                               |
| `a ^ b`    | bitwise XOR                      |
| `[0; 100]` | 0 重複 100 次                       |
| `[0, 100]` | 兩個元素                             |
| `1..4`     | 1、2、3，不包含 4                      |
| `cat.0`    | tuple 第一個元素                      |
| `(a, b)`   | tuple / destructuring pattern    |
| `::`       | path separator，不是 tuple indexing |
| `;`        | 結束 statement                     |
| `{name}`   | format string 中插入變數              |

---

# 二十、目前整體學習狀況

我已經從「照語法試」進入「理解 Rust 為什麼這樣設計」的階段。

目前比較穩定的部分包括：

* 基本變數宣告
* 基本函式
* 函式參數
* 函式回傳值
* `if / else`
* 基本 comparison
* array
* tuple indexing
* 基本 format output

正在建立中的部分包括：

* expression 與 statement 的差異
* `if` expression
* 型別一致性
* scope
* slice
* tuple destructuring
* type inference

需要特別補強的部分則是：

* shadowing
* boolean 與 `!`
* 題目要求與「只求測試通過」的差異
* Rust idiomatic style
* compiler error 的閱讀能力

---

# 結論

這一輪 Rustlings 最大的收穫是開始理解 Rust 的核心思考方式。

Rust 一直在要求我回答：

```text
這是什麼型別？
這個值從哪裡來？
這個 scope 看得到它嗎？
這個 expression 最後產生什麼？
這段資料是新的，還是借來的？
```

這些要求初期感覺會比 Python、JavaScript 嚴格很多，但是好處是很多問題在程式執行前就被 compiler 抓出來。

因此目前最好的學習策略不是單純追求：

```text
94 / 94
```

而是每一題至少確認：

> 我知道它為什麼能過，也知道原本為什麼不能過。

目前進度大約在 Rustlings 基礎資料型別階段，接下來如果持續把每個 compiler error 都當成教材，而不是只把它消掉，等進入 ownership、borrowing、references、struct、enum、match 時，前面這些 `expression / type / scope / slice / destructuring` 的概念就會開始串在一起。

這也是目前值得保留的學習方向：不要只記答案，開始建立 Rust 的心智模型。
