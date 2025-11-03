# Pre-Production Testing with Production Data Clone

Test migrations and changes on a clone of production data before deploying to prod.

## Overview

This command creates a safe testing environment by:
1. Exporting production data
2. Importing it into dev environment
3. Running migrations and validation tests
4. Generating a safety report

## Prerequisites

- Production deployment must exist
- User must have access to production deployment
- Current changes should be committed to git

## Step 1: Backup Current Dev Data

**Important**: This process will temporarily replace your dev data with production data.

```bash
# Create backup of current dev data
pnpx convex export --path dev-backup-$(date +%Y%m%d-%H%M%S).zip
echo "✅ Dev data backed up"
```

## Step 2: Export Production Data

```bash
# Export production database
pnpx convex export --prod --path prod-data.zip
echo "✅ Production data exported to prod-data.zip"
```

If you don't have a prod deployment yet, you can skip this test or create one first.

## Step 3: Import Production Data to Dev

**⚠️ Warning**: This will clear your current dev database!

```bash
# Import production data into dev environment
pnpx convex import --replace prod-data.zip
echo "✅ Production data imported to dev environment"
```

## Step 4: Run Migration Tests

### 4.1 Check for V1 Users

```bash
# Query users to check for V1 fields
pnpx convex run users_v2:getAllUsers | grep -E "role|emulating"
```

### 4.2 Run Migration (if needed)

If V1 users exist:

```bash
# Run migration
pnpx convex run users_v2:migrateToIsDev
echo "Migration completed"
```

### 4.3 Verify Migration Results

```bash
# Verify all users have clean V2 schema
pnpx convex run users_v2:getAllUsers | grep -E "role|emulating" || echo "✅ No V1 fields found - migration successful"
```

## Step 5: Run Validation Suite

### 5.1 TypeScript Validation

```bash
pnpm typecheck
if [ $? -eq 0 ]; then
  echo "✅ TypeScript validation passed"
else
  echo "❌ TypeScript validation failed"
  exit 1
fi
```

### 5.2 Unit Tests

```bash
pnpm test -- --run
if [ $? -eq 0 ]; then
  echo "✅ All unit tests passed"
else
  echo "❌ Some unit tests failed"
  exit 1
fi
```

### 5.3 Schema Validation

Check that all documents match the schema by reviewing Convex dashboard or checking dev server logs for schema validation errors.

### 5.4 Sample Data Verification

```bash
# Query a sample user to verify schema structure
pnpx convex run users_v2:getCurrentUserV2
echo "Sample user retrieved - verify schema structure above"
```

## Step 6: Generate Safety Report

Create a summary of the test results:

```bash
cat << EOF

========================================
PRE-PRODUCTION TEST REPORT
========================================

Test Date: $(date)
Branch: $(git branch --show-current)
Commit: $(git rev-parse --short HEAD)

DATABASE TESTS:
- Production data export: ✅ Success
- Dev environment import: ✅ Success
- Migration execution: [Check output above]
- V1 fields remaining: [Check grep results above]

CODE VALIDATION:
- TypeScript compilation: [✅/❌]
- Unit tests (122 tests): [✅/❌]
- Schema validation: [✅/❌]

RECOMMENDATION:
[SAFE/UNSAFE] to deploy to production

NOTES:
- Review migration output above
- Check for any unexpected warnings
- Verify sample user data structure

========================================
EOF
```

## Step 7: Cleanup

### Option A: Keep Production Data in Dev (for further testing)

```bash
echo "Production data remains in dev environment for testing"
echo "Original dev data is backed up in dev-backup-*.zip"
```

### Option B: Restore Original Dev Data

```bash
# Find the latest backup
LATEST_BACKUP=$(ls -t dev-backup-*.zip | head -1)

# Restore original dev data
pnpx convex import --replace "$LATEST_BACKUP"
echo "✅ Original dev data restored"

# Clean up temporary files
rm prod-data.zip
echo "✅ Temporary files removed"
```

## Safety Checklist

Before deploying to production, verify:

- [ ] All tests passed (TypeScript, unit tests, schema validation)
- [ ] Migration completed successfully with 0 errors
- [ ] No V1 fields remaining in database
- [ ] Sample data looks correct
- [ ] No unexpected warnings or errors in logs
- [ ] Changes are committed and pushed to git
- [ ] Team has reviewed the changes

## Common Issues

### Issue: "Cannot find production deployment"

**Solution**: Create a production deployment first or skip this test if you're not deploying to prod yet.

### Issue: Schema validation errors after import

**Solution**: This likely means the production data has fields not in the current schema. Review the schema changes and consider adding a migration step.

### Issue: Migration fails on production data

**Solution**:
1. Check the migration error message
2. Fix the migration logic
3. Re-run the test
4. DO NOT deploy to production until migration succeeds

## Next Steps

After successful testing:

1. Commit any migration fixes
2. Push to main branch
3. Run deployment command: `/deploy-code-bloom-app`
4. Monitor production deployment carefully
5. Have rollback plan ready (keep prod data backup)

---

**Note**: This is a destructive test for your dev environment. Always ensure you have backups before proceeding.
