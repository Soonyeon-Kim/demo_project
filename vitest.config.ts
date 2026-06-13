import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 테스트에서도 Next.js의 "@/..." 절대 임포트를 해석할 수 있게 별칭 등록
const dir = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: dir + "/" }],
  },
});
