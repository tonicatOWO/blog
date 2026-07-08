---
title: PostgreSQL 基本用法筆記
description: Docker 啟動 PostgreSQL、建立 database/table/user、CRUD 操作、常用 psql 指令速查。
pubDate: '2026-07-08'
---

# docker啟動

```bash
docker run --name some-postgres -e POSTGRES_PASSWORD=mysecretpassword -d postgres
```
---
## 內容物的層級關係：

<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 315.859375 329.7109375" width="315.859375" height="329.7109375" class="excalidraw-svg"><!-- svg-source:excalidraw --><metadata></metadata><defs><style class="style-fonts">
      @font-face { font-family: Excalifont; src: url(data:font/woff2;base64,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); }</style></defs><rect x="0" y="0" width="315.859375" height="329.7109375" fill="#ffffff"></rect><g stroke-linecap="round" transform="translate(10 10) rotate(0 147.9296875 154.85546875)"><path d="M32 0 C111.44 -0.76, 192.7 3.75, 263.86 0 C284.64 -1.41, 293.21 11.13, 295.86 32 C298.63 102.62, 297.05 175.87, 295.86 277.71 C292.41 295.91, 285.26 309.9, 263.86 309.71 C210.47 313.13, 156.68 314.22, 32 309.71 C12.5 309.89, 2.97 302.14, 0 277.71 C4.57 221.58, 2.78 171.3, 0 32 C-1.1 11.26, 8.81 2.53, 32 0" stroke="none" stroke-width="0" fill="#ffec99"></path><path d="M32 0 C102.51 1.76, 175.81 0.78, 263.86 0 M32 0 C98.65 -0.18, 163 -0.7, 263.86 0 M263.86 0 C285.55 1.36, 297.76 12.07, 295.86 32 M263.86 0 C284.43 -1.77, 297.22 9.16, 295.86 32 M295.86 32 C293.59 87.57, 292.91 142.74, 295.86 277.71 M295.86 32 C295.34 121.66, 295.54 210.94, 295.86 277.71 M295.86 277.71 C297.2 299, 283.73 309.91, 263.86 309.71 M295.86 277.71 C298.09 300.47, 285.78 309.43, 263.86 309.71 M263.86 309.71 C202.24 309.55, 139.77 306.63, 32 309.71 M263.86 309.71 C203.82 311.06, 143.88 309.72, 32 309.71 M32 309.71 C10.29 308.38, 0.51 297.43, 0 277.71 M32 309.71 C9.3 311.39, -1 297.74, 0 277.71 M0 277.71 C-1.73 182.12, -1.96 85.74, 0 32 M0 277.71 C1.04 185.52, 0.72 93.38, 0 32 M0 32 C-0.92 8.93, 9.58 -1.25, 32 0 M0 32 C1.54 10.46, 10.41 0.71, 32 0" stroke="#f08c00" stroke-width="2" fill="none"></path></g><g transform="translate(33.94921875 28.40234375) rotate(0 46.95995330810547 12.5)"><text x="0" y="17.619999999999997" font-family="Excalifont, Xiaolai, sans-serif, Segoe UI Emoji" font-size="20px" fill="#846358" text-anchor="start" style="white-space: pre;" direction="ltr" dominant-baseline="alphabetic">Database</text></g><g stroke-linecap="round" transform="translate(38.30078125 63.703125) rotate(0 125.00390625 119.376953125)"><path d="M32 0 C77.93 -4.69, 122.33 -2.82, 218.01 0 C238.87 3.58, 252.39 9.63, 250.01 32 C243.98 82.03, 247.5 138.52, 250.01 206.75 C247.34 225.62, 241.81 237.55, 218.01 238.75 C157.91 241.23, 97.11 244.14, 32 238.75 C7.77 235.31, 2.27 229.4, 0 206.75 C-0.35 167.84, -1.1 130.28, 0 32 C-1.2 11.69, 8.23 3.53, 32 0" stroke="none" stroke-width="0" fill="#a5d8ff"></path><path d="M32 0 C92.53 -0.91, 153.63 2.34, 218.01 0 M32 0 C82.62 2.36, 133.83 2.38, 218.01 0 M218.01 0 C238.68 -1.54, 251.19 9.36, 250.01 32 M218.01 0 C237.68 -1.69, 252.15 9.57, 250.01 32 M250.01 32 C249.75 79.41, 249.49 128.54, 250.01 206.75 M250.01 32 C251.43 85.23, 250.03 138.59, 250.01 206.75 M250.01 206.75 C251.95 229.33, 239.85 238.51, 218.01 238.75 M250.01 206.75 C249.29 225.95, 237.66 239.73, 218.01 238.75 M218.01 238.75 C147.33 237.81, 79.07 237.13, 32 238.75 M218.01 238.75 C149.7 236.39, 82.01 236.25, 32 238.75 M32 238.75 C9.48 240.21, -0.87 226.95, 0 206.75 M32 238.75 C12.74 239.66, -0.49 226.79, 0 206.75 M0 206.75 C2.74 151.36, 2.86 98.35, 0 32 M0 206.75 C-1.34 156.13, -1.42 106.63, 0 32 M0 32 C1.34 10.49, 10.44 0.61, 32 0 M0 32 C1.09 9.36, 10.17 -0.85, 32 0" stroke="#1971c2" stroke-width="2" fill="none"></path></g><g transform="translate(58.765625 84.1796875) rotate(0 34.689971923828125 12.5)"><text x="0" y="17.619999999999997" font-family="Excalifont, Xiaolai, sans-serif, Segoe UI Emoji" font-size="20px" fill="#846358" text-anchor="start" style="white-space: pre;" direction="ltr" dominant-baseline="alphabetic">Schema</text></g><g stroke-linecap="round" transform="translate(72.87109375 112.95703125) rotate(0 99.658203125 86.427734375)"><path d="M32 0 C66.81 3.27, 104.95 -1.35, 167.32 0 C188.8 -2.95, 202.82 7.22, 199.32 32 C196.68 52.7, 201.82 77.15, 199.32 140.86 C200.5 159.32, 191.12 174.69, 167.32 172.86 C123.15 171.5, 87.05 176.26, 32 172.86 C8 172, 1.77 161.09, 0 140.86 C-0.19 107.44, -1.43 75.51, 0 32 C1.55 10.4, 7.82 -1.93, 32 0" stroke="none" stroke-width="0" fill="#ffc9c9"></path><path d="M32 0 C61.99 -3.09, 91.32 -0.84, 167.32 0 M32 0 C81.48 -1.72, 132.2 -1.6, 167.32 0 M167.32 0 C187.21 -1.47, 201.18 9.72, 199.32 32 M167.32 0 C188.08 -2.04, 197.62 12.16, 199.32 32 M199.32 32 C199.97 61.88, 199.18 91.39, 199.32 140.86 M199.32 32 C199.49 65.05, 198.78 96.74, 199.32 140.86 M199.32 140.86 C198.69 160.33, 187.19 173.7, 167.32 172.86 M199.32 140.86 C201.06 162.99, 186.42 171.92, 167.32 172.86 M167.32 172.86 C122.25 173.56, 72.7 172.6, 32 172.86 M167.32 172.86 C135.14 172.49, 103.72 171.2, 32 172.86 M32 172.86 C12.47 173.64, -0.43 161.06, 0 140.86 M32 172.86 C11.02 171.22, -0.42 163.91, 0 140.86 M0 140.86 C-1.19 110.85, -1.36 77.93, 0 32 M0 140.86 C1.26 117.59, 0.48 94.81, 0 32 M0 32 C0.95 9.53, 10.24 -0.74, 32 0 M0 32 C-1.15 10.34, 12.92 -0.36, 32 0" stroke="#e03131" stroke-width="2" fill="none"></path></g><g transform="translate(97.94140625 142.6953125) rotate(0 26.499977111816406 12.5)"><text x="0" y="17.619999999999997" font-family="Excalifont, Xiaolai, sans-serif, Segoe UI Emoji" font-size="20px" fill="#846358" text-anchor="start" style="white-space: pre;" direction="ltr" dominant-baseline="alphabetic">Table</text></g></svg>
---
## 連線

```bash
psql -u postgres
```


## 建立database

```sql
create database mydb;
```


## 切換database

```sql
\c mydb;
```


## 建立table

```sql
create table test (
  id serial primary key,
  name varchar(100) not null
);
```


## 刪除table

```sql
drop table test;
```


## 建立schema

```sql
create schema myschema;
```


## 建立user

```sql
create user yaya with password 'yaya';
```


## 指定user連線

```bash
psql -u yaya -d mydb
```


## 授權權限

```sql
grant all privileges on all tables in schema public to yaya;
grant all on schema public to yaya;
```


## 插入資料

```sql
insert into test (name) values ('alice');
insert into test (name) values 
  ('bob'),
  ('charlie');
```


## 查詢資料

```sql
select * from test;
select id, name from test order by id;
```


## 權限修復

```sql
grant create, usage on schema public to your_username;
```


## 常用psql指令

```sql
\l          -- 列出所有databases
\dt         -- 列出當前schema的tables  
\d test     -- 顯示test table結構
\c mydb     -- 切換database
\du         -- 列出所有users
\dn         -- 列出所有schemas
\q          -- 退出psql
```
