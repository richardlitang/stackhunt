# Supabase Project Configuration

**CRITICAL: Always use the correct project ID**

## Correct Project ID

**Production Project:** `vhelpqzbtzwiddoebnyy`
- URL: https://vhelpqzbtzwiddoebnyy.supabase.co
- Name: stackhunt
- Status: ACTIVE_HEALTHY
- Region: us-east-1

## How to Get Project ID

**Method 1: From .env file**
```bash
grep "SUPABASE_URL" .env
# Returns: PUBLIC_SUPABASE_URL=https://vhelpqzbtzwiddoebnyy.supabase.co
# Project ID: vhelpqzbtzwiddoebnyy (subdomain)
```

**Method 2: From Supabase MCP**
```typescript
// Always verify project ID using MCP first
const projects = await mcp__supabase__list_projects();
// Use: projects[0].id for stackhunt project
```

## Usage in Tools

**When using Supabase MCP tools:**
```typescript
// ✅ CORRECT
mcp__supabase__execute_sql({
  project_id: "vhelpqzbtzwiddoebnyy", // From list_projects or .env
  query: "..."
})

// ❌ WRONG - DO NOT HARDCODE DIFFERENT IDs
mcp__supabase__execute_sql({
  project_id: "xebfrlbnhybftnidxqlq", // This is wrong!
  query: "..."
})
```

## Dashboard URLs

**SQL Editor:** https://supabase.com/dashboard/project/vhelpqzbtzwiddoebnyy/sql/new
**Tables:** https://supabase.com/dashboard/project/vhelpqzbtzwiddoebnyy/editor
**Logs:** https://supabase.com/dashboard/project/vhelpqzbtzwiddoebnyy/logs

## Important Notes

1. **Always extract from SUPABASE_URL** - don't hardcode
2. **Verify with MCP** - call `list_projects()` if unsure
3. **Update scripts** - fix any scripts with wrong IDs

## Other Projects

- pagestack: `lylqvdamoyqjruhdtrdj` (INACTIVE)
  - Only use if specifically working on pagestack project
