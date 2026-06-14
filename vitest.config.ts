import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 테스트에서도 Next.js의 "@/..." 절대 임포트를 해석할 수 있게 별칭 등록
const dir = path.dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: dir + "/" }],
  },
  test: {
    coverage: {
      provider: "v8",
      // 결정론적 로직(lib)과 서버 라우트만 측정. UI(page/layout)는 포함하되
      // 테스트·타입·설정 파일은 제외해 수치가 의미 있게 나오도록.
      include: ["lib/**/*.ts", "app/**/*.{ts,tsx}"],
      exclude: ["**/__tests__/**", "lib/types.ts"],
    },
  },
});
