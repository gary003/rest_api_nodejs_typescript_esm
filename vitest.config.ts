import { defineConfig } from 'vitest/config'

const globalSetup = process.env.UNIT_TEST == 'true' ? './tests/vitest.setup.unit.ts' : './tests/vitest.setup.ts'

const filesToExclude = [
  'src/v1/infrastructure/observability/**',
  'src/v1/infrastructure/persistence/database/db_volume/**',
  'src/v1/infrastructure/persistence/database/db_scripts/**',
  './**/*dto.ts',
  '**/*.db',
  '**/db_file_volume/**',
  '**/sqlite/**'
]

if (process.env.UNIT_TEST === 'true') {
  filesToExclude.push('src/v1/infrastructure', 'src/v1/domain', 'src/v1/helpers')
}

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    globalSetup,
    // This ensures Vitest looks for the right files regardless of ext
    include: ['./tests/**/*.spec.ts', './tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/v1/**'],
      exclude: filesToExclude,
      thresholds: {
        branches: 80,
        lines: 80,
        functions: 80,
        statements: 80
      }
    }
  }
})
