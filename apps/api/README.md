# Retained content API rollback source

Production blog APIs and shared MFA now run inside ../portfolio. This NestJS application and its IAM-protected function are retained for coordinated rollback, not called by the common app. Preserve its lockfile/build/tests until rollback retention is explicitly retired. See ../../docs/unified-app-migration.md and ../../docs/operations.md.
