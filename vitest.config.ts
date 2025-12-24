import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // This ensures Vitest looks for the right files regardless of ext
    include: ['./tests/**'],
    coverage: {
      provider: 'v8',
      include: ['src/v1/**'],
      exclude: [
        'src/v1/infrastructure/observability/**',
        'src/v1/infrastructure/persistence/database/db_volume/**',
        'src/v1/infrastructure/persistence/database/db_scripts/**',
        './**/*dto.ts'
      ],
      // thresholds: {
      //   branches: 80,
      //   lines: 80,
      //   functions: 80,
      //   statements: 80
      // }
    }
  }
})
