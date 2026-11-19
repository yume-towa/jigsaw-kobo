// src/JigsawKobo.jsx を、ブラウザがそのまま読める app.js に変換します。
//
//   npm install          (最初の一度だけ)
//   node build.mjs
//
import { transformSync } from "@babel/core";
import presetReact from "@babel/preset-react";
import { readFileSync, writeFileSync } from "node:fs";

const SRC = "src/JigsawKobo.jsx";
const OUT = "app.js";

let code = readFileSync(SRC, "utf8");

// ブラウザでは React を <script> で読み込むので、import と export は外す
code = code.replace(/^import React[^\n]*\n/m, "");
code = code.replace(/export default function/, "function");

const wrapped = `// このファイルは build.mjs が ${SRC} から自動生成します。
// 直接編集せず、${SRC} を直してから node build.mjs を実行してください。
(function () {
  "use strict";
  var useState = React.useState, useRef = React.useRef,
      useEffect = React.useEffect, useCallback = React.useCallback;

${code}

  ReactDOM.createRoot(document.getElementById("root")).render(
    React.createElement(JigsawKobo)
  );
})();
`;

const { code: out } = transformSync(wrapped, {
  presets: [[presetReact, { runtime: "classic" }]],
  filename: SRC,
  compact: false,
  comments: true,
  // 日本語の文字列を \uXXXX にせず、そのまま出力する
  // (Babel の版によって出力が変わり、app.js 全体に差分が出るのを防ぐ)
  generatorOpts: { jsescOption: { minimal: true } },
});

writeFileSync(OUT, out);
console.log(`${OUT} を生成しました (${(out.length / 1024).toFixed(1)} KB)`);
