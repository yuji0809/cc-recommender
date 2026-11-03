/**
 * Logger
 *
 * MCP サーバーは stdio トランスポートで動くため、stdout は JSON-RPC の通信路になる。
 * サーバーの実行経路でのログは必ずこの logger を使い、stderr に出力する。
 * （データ生成スクリプト専用のコードは stdout に出力してよい）
 */

import { format } from "node:util";

function writeToStderr(args: unknown[]): void {
  process.stderr.write(`${format(...args)}\n`);
}

export const logger = {
  info: (...args: unknown[]): void => writeToStderr(args),
  warn: (...args: unknown[]): void => writeToStderr(args),
  error: (...args: unknown[]): void => writeToStderr(args),
};
